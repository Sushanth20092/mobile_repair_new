"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export default function AgentApplicationPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    shopName: "",
    shopAddress: "",
    city_id: "",
    pincode: "",
    experience: "",
    specializations: [] as string[],
    idProof: null as string | null,
    shopImages: [] as string[],
    agreeToTerms: false,
    
  })
  const [cities, setCities] = useState<{ id: string, name: string }[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [applications, setApplications] = useState<any[]>([]);
  const [idProofError, setIdProofError] = useState("");
  const [shopImagesError, setShopImagesError] = useState("");

  const specializations = [
    "Mobile Phone Repair",
    "Tablet Repair",
    "Laptop Repair",
    "Smartwatch Repair",
    "Audio Device Repair",
    "Gaming Console Repair",
  ]

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data } = await supabase.from('cities').select('id, name')
        setCities(data || [])
      } catch {
        setCities([])
      } finally {
        setCitiesLoading(false)
      }
    }
    fetchCities()
  }, [])

  useEffect(() => {
    supabase.from('agent_applications').select('*').then(({ data }) => setApplications(data || []));
  }, []);

  useEffect(() => {
    // Redirect if not authenticated
    if (user === null) {
      toast({
        title: "Please log in to apply as an agent.",
        variant: "destructive",
      })
      router.replace("/auth/login")
    }
  }, [user, router, toast])

  const handleSpecializationToggle = (specialization: string) => {
    const newSpecializations = formData.specializations.includes(specialization)
      ? formData.specializations.filter((s) => s !== specialization)
      : [...formData.specializations, specialization]
    setFormData({ ...formData, specializations: newSpecializations })
  }

  const handleIdProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const fileExt = file.name.split('.').pop()
      const filePath = `agent-id/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const { data, error } = await supabase.storage.from('agent-id').upload(filePath, file)
      if (error) {
        toast({ title: "Error", description: `Failed to upload ID proof`, variant: "destructive" })
        return
      }
      const { data: publicUrlData } = supabase.storage.from('agent-id').getPublicUrl(filePath)
      setFormData({ ...formData, idProof: publicUrlData.publicUrl })
    }
  }

  const handleShopImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (formData.shopImages.length + files.length > 5) {
      toast({ title: "Error", description: "Maximum 5 shop images allowed", variant: "destructive" })
      return
    }
    const uploadedUrls: string[] = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const filePath = `agent-shop/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const { data, error } = await supabase.storage.from('agent-shop').upload(filePath, file)
      if (error) {
        toast({ title: "Error", description: `Failed to upload shop image: ${file.name}`, variant: "destructive" })
        continue
      }
      const { data: publicUrlData } = supabase.storage.from('agent-shop').getPublicUrl(filePath)
      uploadedUrls.push(publicUrlData.publicUrl)
    }
    setFormData({ ...formData, shopImages: [...formData.shopImages, ...uploadedUrls] })
  }

  // Check for duplicate pending application for this user
  const hasPendingApplication = applications.some(
    (app: any) => app.user_id === user?.id && app.status === "pending"
  )

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIdProofError("");
    setShopImagesError("");
    setIsLoading(true)
    try {
      // Fetch authenticated user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        toast({ title: "Error", description: "Could not verify your session. Please log in again.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      // Compare emails
      if (formData.email.trim().toLowerCase() !== userData.user.email?.trim().toLowerCase()) {
        toast({ title: "Email mismatch", description: "Email mismatch. Please use the same email as your registered account.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      // Validate id_proof and shop_images
      let hasError = false;
      if (!formData.idProof) {
        setIdProofError("Please upload an ID proof document.");
        hasError = true;
      }
      if (!formData.shopImages || formData.shopImages.length < 1) {
        setShopImagesError("Please upload at least one shop image.");
        hasError = true;
      }
      if (hasError) {
        setIsLoading(false);
        return;
      }
      // Proceed with insert if all validations pass
      const { data, error } = await supabase.from('agent_applications').insert([
        {
          user_id: user?.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          shop_name: formData.shopName,
          shop_address: formData.shopAddress,
          city_id: formData.city_id,
          pincode: formData.pincode,
          experience: formData.experience,
          specializations: formData.specializations,
          id_proof: formData.idProof,
          shop_images: formData.shopImages,
          agree_to_terms: formData.agreeToTerms,
          // status, reviewed_by, reviewed_at, created_at, updated_at are handled by default
        }
      ])
      if (error) throw error
      toast({ title: "Success", description: "Application submitted!" })
      router.push("/agent/dashboard")
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit application.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  function getCityName(city_id: string) {
    const city = cities.find(c => c.id === city_id);
    return city ? city.name : '';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Join as Repair Agent</CardTitle>
              <CardDescription>Apply to become a certified repair agent and grow your business with us</CardDescription>
            </CardHeader>

            <CardContent>
              {hasPendingApplication ? (
                <div className="text-center text-yellow-600 font-semibold py-8">
                  You already have a pending agent application. Please wait for it to be reviewed.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Personal Information</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          placeholder="Enter phone number"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Make sure you enter the same email used to register your account.
                      </p>
                    </div>
                  </div>

                  {/* Shop Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Shop Information</h3>

                    <div className="space-y-2">
                      <Label htmlFor="shopName">Shop Name *</Label>
                      <Input
                        id="shopName"
                        placeholder="Enter your shop name"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shopAddress">Shop Address *</Label>
                      <Textarea
                        id="shopAddress"
                        placeholder="Enter complete shop address"
                        value={formData.shopAddress}
                        onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Select
                          value={formData.city_id}
                          onValueChange={value => setFormData({ ...formData, city_id: value })}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={cities.length === 0 ? "Loading cities..." : "Select city"} />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map(city => (
                              <SelectItem key={city.id} value={city.id}>
                                {city.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pincode">Pincode *</Label>
                        <Input
                          id="pincode"
                          placeholder="Enter pincode"
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Experience & Specializations */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Experience & Specializations</h3>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Select
                        value={formData.experience}
                        onValueChange={(value) => setFormData({ ...formData, experience: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select experience" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1">0-1 years</SelectItem>
                          <SelectItem value="1-3">1-3 years</SelectItem>
                          <SelectItem value="3-5">3-5 years</SelectItem>
                          <SelectItem value="5-10">5-10 years</SelectItem>
                          <SelectItem value="10+">10+ years</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label>Specializations (Select all that apply)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {specializations.map((specialization) => (
                          <div key={specialization} className="flex items-center space-x-2">
                            <Checkbox
                              id={specialization}
                              checked={formData.specializations.includes(specialization)}
                              onCheckedChange={() => handleSpecializationToggle(specialization)}
                            />
                            <Label htmlFor={specialization} className="text-sm">
                              {specialization}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Documents</h3>

                    <div className="space-y-2">
                      <Label htmlFor="idProof">ID Proof (Aadhar/PAN/Driving License)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="flex text-sm text-muted-foreground">
                            <label
                              htmlFor="id-upload"
                              className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                            >
                              <span>Upload ID proof</span>
                              <input
                                id="id-upload"
                                name="id-upload"
                                type="file"
                                className="sr-only"
                                accept="image/*,.pdf"
                                onChange={handleIdProofUpload}
                              />
                            </label>
                          </div>
                          {formData.idProof && <p className="text-sm text-green-600 mt-2">✓ {formData.idProof}</p>}
                          {idProofError && <p className="text-sm text-destructive mt-2">{idProofError}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shopImages">Shop Images (Max 5)</Label>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                        <div className="text-center">
                          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <div className="flex text-sm text-muted-foreground">
                            <label
                              htmlFor="shop-upload"
                              className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                            >
                              <span>Upload shop images</span>
                              <input
                                id="shop-upload"
                                name="shop-upload"
                                type="file"
                                className="sr-only"
                                multiple
                                accept="image/*"
                                onChange={handleShopImagesUpload}
                              />
                            </label>
                          </div>
                          {formData.shopImages.length > 0 && (
                            <p className="text-sm text-green-600 mt-2">
                              ✓ {formData.shopImages.length} image(s) uploaded
                            </p>
                          )}
                          {shopImagesError && <p className="text-sm text-destructive mt-2">{shopImagesError}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => setFormData({ ...formData, agreeToTerms: checked as boolean })}
                    />
                    <Label htmlFor="terms" className="text-sm">
                      I agree to the{" "}
                      <Link href="/terms" className="text-primary hover:underline">
                        Terms and Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Submitting Application..." : "Submit Application"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
