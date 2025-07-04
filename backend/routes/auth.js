/* eslint-disable @typescript-eslint/no-var-requires */
const express = require("express")
const { supabase } = require("../supabaseClient")
const { auth } = require("../middleware/auth")
const router = express.Router()
const bcrypt = require('bcryptjs')

// Register
router.post("/register", async (req, res) => {
  const { name, email, phone, password, city_id, role = "user" } = req.body
  // Hash the password before storing (using bcrypt)
  const hashedPassword = await bcrypt.hash(password, 12)
  // Register user in Supabase Auth, include city_id in user metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, phone, role, city_id } }
  })
  if (error) return res.status(400).json({ message: error.message })
  // No manual insert into profiles table here; Supabase trigger will handle it
  res.status(201).json({ message: "User registered. Please check your email to verify your account." })
})

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return res.status(400).json({ message: error.message })
  res.json({ message: "Login successful", session: data.session, user: data.user })
})

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) return res.status(400).json({ message: error.message })
  res.json({ message: "Password reset email sent" })
})

// Get current user
router.get("/me", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1]
  if (!token) return res.status(401).json({ message: "No token provided" })
  const { data, error } = await supabase.auth.getUser(token)
  if (error) return res.status(401).json({ message: error.message })
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("*").eq("id", data.user.id).single()
  if (profileError) return res.status(400).json({ message: profileError.message })
  res.json({ user: { ...data.user, ...profile } })
})

module.exports = router

