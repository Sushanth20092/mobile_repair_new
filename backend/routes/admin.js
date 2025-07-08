const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Helper: check admin role
async function isAdmin(token) {
  const { data, error } = await supabase.auth.getUser(token)
  if (error) return false
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).single()
  return profile && profile.role === "admin"
}

// Admin Dashboard Stats
router.get("/dashboard", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })

  // Get stats
  const [{ count: totalUsers }, { count: totalAgents }, { count: pendingAgents }, { count: totalBookings }, { count: completedBookings }, { count: pendingBookings }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "user"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "agent").eq("status", "approved"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "agent").eq("status", "pending"),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).in("status", ["pending", "confirmed"]),
  ])

  // Revenue calculation
  const { data: revenueData } = await supabase
    .from("bookings")
    .select("pricing")
    .eq("status", "completed")
    .eq("payment_status", "paid")
  const totalRevenue = (revenueData || []).reduce((sum, b) => sum + (b.pricing?.total || 0), 0)

  // Recent bookings
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("*, user:profiles(name, email), device:devices(category, brand, model), agent:profiles(shopName)")
    .order("created_at", { ascending: false })
    .limit(10)

  // Monthly booking trends
  // (Supabase SQL: you may want to use a view or RPC for this in production)
  const { data: monthlyBookings } = await supabase.rpc("monthly_booking_trends")

  res.json({
    stats: {
      totalUsers,
      totalAgents,
      pendingAgents,
      totalBookings,
      completedBookings,
      pendingBookings,
      totalRevenue,
    },
    recentBookings,
    monthlyBookings,
  })
})

// Manage Cities
router.get("/cities", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })
  const { data: cities, error } = await supabase.from("cities").select("*").order("name")
  if (error) return res.status(500).json({ message: error.message })
  res.json({ cities })
})

router.post("/cities", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })
  const { name, state, pincodes, deliveryCharges } = req.body
  const { data: city, error } = await supabase.from("cities").insert([{ name, state, pincodes, deliveryCharges }]).select().single()
  if (error) return res.status(500).json({ message: error.message })
  res.status(201).json({ message: "City added successfully", city })
})

router.patch("/cities/:id", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })
  const { id } = req.params
  const { data: city, error } = await supabase.from("cities").update(req.body).eq("id", id).select().single()
  if (error) return res.status(500).json({ message: error.message })
  res.json({ message: "City updated successfully", city })
})

router.delete("/cities/:id", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })
  const { id } = req.params
  const { error } = await supabase.from("cities").delete().eq("id", id)
  if (error) return res.status(500).json({ message: error.message })
  res.json({ message: "City deleted successfully" })
})

// Manage Devices
router.get("/devices", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })
  const { category, brand } = req.query
  let query = supabase.from("devices").select("*")
  if (category) query = query.eq("category", category)
  if (brand) query = query.eq("brand", brand)
  const { data: devices, error } = await query.order("category").order("brand").order("model")
  if (error) return res.status(500).json({ message: error.message })
  res.json({ devices })
})

router.post("/devices", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })
  const { category_id, brand, model_id, image, commonFaults } = req.body
  try {
    const { data: device, error } = await supabase.from("devices").insert([{ category_id, brand, model_id, image, commonFaults }]).select().single()
    if (error) {
      if (error.message && error.message.toLowerCase().includes("duplicate")) {
        return res.status(409).json({ message: "Device with this category, brand, and model already exists." })
      }
      return res.status(500).json({ message: error.message })
    }
    res.status(201).json({ message: "Device added successfully", device })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.patch("/devices/:id", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })
  const { id } = req.params
  const { data: device, error } = await supabase.from("devices").update(req.body).eq("id", id).select().single()
  if (error) return res.status(500).json({ message: error.message })
  res.json({ message: "Device updated successfully", device })
})

router.delete("/devices/:id", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token || !(await isAdmin(token))) return res.status(403).json({ message: "Access denied" })
  const { id } = req.params
  const { error } = await supabase.from("devices").delete().eq("id", id)
  if (error) return res.status(500).json({ message: error.message })
  res.json({ message: "Device deleted successfully" })
})

// Example: Get all users (admin only)
router.get("/users", auth, async (req, res) => {
  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", req.user.id).single()
  if (profile?.role !== "admin") return res.status(403).json({ message: "Forbidden" })
  const { data, error } = await supabase.from("profiles").select("*")
  if (error) return res.status(400).json({ message: error.message })
  res.json({ users: data })
})

module.exports = router
