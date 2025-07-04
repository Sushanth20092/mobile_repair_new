"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Tablet, Headphones, Watch, Zap, Shield, Clock, Star, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"

const services = [
  {
    icon: <Smartphone className="h-8 w-8" />,
    title: "Mobile Repair",
    description: "Screen replacement, battery issues, water damage repair",
    features: ["Screen Replacement", "Battery Replacement", "Water Damage", "Software Issues"],
  },
  {
    icon: <Tablet className="h-8 w-8" />,
    title: "Tablet Repair",
    description: "iPad and Android tablet repairs",
    features: ["Screen Repair", "Charging Port", "Speaker Issues", "Performance Optimization"],
  },
  {
    icon: <Headphones className="h-8 w-8" />,
    title: "Audio Devices",
    description: "Headphones, earbuds, and speaker repairs",
    features: ["Audio Quality", "Connectivity", "Battery Life", "Physical Damage"],
  },
  {
    icon: <Watch className="h-8 w-8" />,
    title: "Smartwatch Repair",
    description: "Apple Watch, Samsung Galaxy Watch repairs",
    features: ["Screen Replacement", "Battery Issues", "Water Resistance", "Strap Replacement"],
  },
]

export default function HomePage() {
  const [selectedCity, setSelectedCity] = useState("")
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [showCityError, setShowCityError] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const [cities, setCities] = useState<{ id: string, name: string, pincodes?: string[] }[]>([])


  const [citiesLoading, setCitiesLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
    const fetchCities = async () => {
      try {
        const { data, error } = await supabase.from('cities').select('*')
        if (error) {
          console.error("Error fetching cities:", error)
        } else {
          setCities(data || [])
        }
      } catch (err) {
        console.error("Unexpected error:", err)
      } finally {
        setCitiesLoading(false)
      }
    }
    fetchCities()
  }, [])
  

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleLoginRedirect = () => {
    if (!selectedCity) {
      setShowCityError(true)
      toast({
        title: "City Selection Required",
        description: "Please select your city before proceeding to login.",
        variant: "destructive",
      })
      return
    }
    setShowCityError(false)
    router.push("/auth/login")
  }

  const handleRepairNow = () => {
    if (!selectedCity) {
      setShowCityError(true)
      toast({
        title: "City Selection Required",
        description: "Please select your city before proceeding.",
        variant: "destructive",
      })
      return
    }
    setShowCityError(false)
    
    if (!user) {
      router.push("/auth/login")
    } else {
      router.push("/customer/book-repair")
    }
  }

  // Hide error message when city is selected
  const handleCityChange = (value: string) => {
    setSelectedCity(value)
    if (value) {
      setShowCityError(false)
      localStorage.setItem("selectedCity", value)
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Smartphone className="h-6 w-6" />
              <span className="font-bold text-xl">RepairHub</span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <button
              onClick={() => scrollToSection("services")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Our Services
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("contact")}
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Contact
            </button>
          </nav>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>

            {user ? (
              <>
                <Link href={`/${user.role}/dashboard`}>
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Button
                  variant="destructive"
                  onClick={() => {
                    logout()
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={handleLoginRedirect}
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Professional Mobile Device
              <span className="text-primary"> Repair Services</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Fast, reliable, and affordable repair services for all your mobile devices. Expert technicians, genuine
              parts, and warranty included.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <div className="flex flex-col items-center">
              <Select value={selectedCity} onValueChange={handleCityChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={citiesLoading ? "Loading cities..." : "Select your city"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.id}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showCityError && (
                <p className="text-sm text-destructive mt-2">Please select the city</p>
              )}
            </div>

            <Button
              size="lg"
              className="px-8"
              onClick={handleRepairNow}
            >
              <Zap className="mr-2 h-4 w-4" />
              Repair Now
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground"
          >
            <div className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              90 Day Warranty
            </div>
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              Same Day Service
            </div>
            <div className="flex items-center">
              <Star className="mr-2 h-4 w-4" />
              4.9/5 Rating
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We repair all types of mobile devices with expert care and genuine parts
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="text-primary mb-4">{service.icon}</div>
                    <CardTitle className="text-xl">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="mr-2 mb-2">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Simple steps to get your device repaired</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Book Online",
                description: "Select your device, describe the issue, and choose your preferred service option",
              },
              {
                step: "2",
                title: "Get It Fixed",
                description: "Our expert technicians diagnose and repair your device using genuine parts",
              },
              {
                step: "3",
                title: "Collect & Enjoy",
                description: "Pick up your repaired device or get it delivered to your doorstep",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Your Device Fixed?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of satisfied customers who trust us with their devices
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary" 
              className="px-8"
              onClick={handleLoginRedirect}
            >
              Start Repair Process
            </Button>
            <Link href="/agent/apply">
              <Button
                size="lg"
                variant="outline"
                className="px-8 bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                Join as Agent
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-4 bg-muted">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Smartphone className="h-6 w-6" />
                <span className="font-bold text-xl">RepairHub</span>
              </div>
              <p className="text-muted-foreground">
                Professional mobile device repair services with expert technicians and genuine parts.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Mobile Repair</li>
                <li>Tablet Repair</li>
                <li>Audio Devices</li>
                <li>Smartwatch Repair</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>Help Center</li>
                <li>Track Repair</li>
                <li>Warranty</li>
                <li>Contact Us</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>support@repairhub.com</li>
                <li>+91 98765 43210</li>
                <li>Available 9 AM - 6 PM</li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; 2024 RepairHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
