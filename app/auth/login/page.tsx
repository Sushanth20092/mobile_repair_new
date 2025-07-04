"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Eye, EyeOff, Smartphone, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("login")
  const router = useRouter()
  const { login, signup, forgotPassword } = useAuth()
  const { toast } = useToast()

  // Login form state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
    role: "customer",
  })

  // Register form state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    address: "",
    city: "",
    pincode: "",
    agreeToTerms: false,
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (!loginData.email || !loginData.password) {
        toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" })
        return
      }
      await login(loginData.email, loginData.password)
      toast({ title: "Success", description: "Logged in successfully" })
      // Redirect based on role
      // Fetch user from context after login
      setTimeout(() => {
        const user = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}')
        switch (user?.user_metadata?.role) {
          case "admin":
            router.push("/admin/dashboard")
            break
          case "agent":
            router.push("/agent/dashboard")
            break
          default:
            router.push("/customer/dashboard")
        }
      }, 500)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Invalid credentials", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      if (!registerData.name || !registerData.email || !registerData.password) {
        toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" })
        return
      }
      if (registerData.password !== registerData.confirmPassword) {
        toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
        return
      }
      if (registerData.password.length < 6) {
        toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" })
        return
      }
      if (!registerData.agreeToTerms) {
        toast({ title: "Error", description: "Please agree to terms and conditions", variant: "destructive" })
        return
      }
      await signup({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        role: registerData.role as any,
      })
      toast({ title: "Success", description: "Account created! Please check your email to verify." })
      setActiveTab("login")
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Registration failed. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" })
      return
    }
    try {
      await forgotPassword(loginData.email)
      toast({ title: "Success", description: "Password reset email sent!" })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send reset email", variant: "destructive" })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Welcome to RepairHub</CardTitle>
            <CardDescription>Sign in to your account or create a new one</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Login as</Label>
                    <Select
                      value={loginData.role}
                      onValueChange={(value) => setLoginData({ ...loginData, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter your name"
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        placeholder="Enter phone number"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="Enter your address"
                      value={registerData.address}
                      onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Enter city"
                        value={registerData.city}
                        onChange={(e) => setRegisterData({ ...registerData, city: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        placeholder="Enter pincode"
                        value={registerData.pincode}
                        onChange={(e) => setRegisterData({ ...registerData, pincode: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password *</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password *</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={registerData.agreeToTerms}
                      onCheckedChange={(checked) =>
                        setRegisterData({ ...registerData, agreeToTerms: checked as boolean })
                      }
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms and Conditions
                      </Link>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
