const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()

// Get all devices
router.get("/", auth, async (req, res) => {
  const { data, error } = await supabase.from("devices").select("*")
  if (error) return res.status(400).json({ message: error.message })
  res.json({ devices: data })
})

// Get all categories
router.get("/categories", auth, async (req, res) => {
  const { data, error } = await supabase.from("categories").select("*")
  if (error) return res.status(500).json({ message: error.message })
  res.json({ categories: data })
})

// Get brands by category
router.get("/brands/:category", auth, async (req, res) => {
  const { category } = req.params
  const { data, error } = await supabase.from("devices").select("brand").eq("category", category).neq("is_active", false)
  if (error) return res.status(500).json({ message: error.message })
  const brands = [...new Set(data.map(d => d.brand))]
  res.json({ brands })
})

// Get models by category
router.get("/models/:category_id", auth, async (req, res) => {
  const { category_id } = req.params
  const { data, error } = await supabase.from("models").select("*").eq("category_id", category_id)
  if (error) return res.status(500).json({ message: error.message })
  res.json({ models: data })
})

// Get device by ID
router.get("/:id", auth, async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase.from("devices").select("*").eq("id", id).single()
  if (error) return res.status(404).json({ message: error.message })
  res.json({ device: data })
})

// Search devices
router.get("/search/:query", auth, async (req, res) => {
  const { query } = req.params
  const { data, error } = await supabase.from("devices").select("*").or(`brand.ilike.%${query}%,model.ilike.%${query}%`).neq("is_active", false).limit(20)
  if (error) return res.status(500).json({ message: error.message })
  res.json({ devices: data })
})

module.exports = router
