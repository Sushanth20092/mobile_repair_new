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
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Upload, X, MapPin, CalendarIcon, ArrowLeft, ArrowRight, CheckCircle, CreditCard, Banknote } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { supabase } from "@/lib/api"

type Category = { id: string; name: string };
type Model = { id: string; name: string; category_id: string };

const commonFaults = [
  "Screen Cracked/Broken",
  "Battery Issues",
  "Charging Port Problems",
  "Water Damage",
  "Speaker/Audio Issues",
  "Camera Problems",
  "Software Issues",
  "Button Not Working",
  "Overheating",
  "Network/Connectivity Issues",
]

export default function BookRepairPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    category: "",
    brand: "",
    model: "",
    faults: [] as string[],
    customFault: "",
    images: [] as string[],
    serviceType: "",
    selectedAgent: "",
    address: "",
    pincode: "",
    city: "",
    collectionDate: undefined as Date | undefined,
    collectionTime: "",
    deliveryDate: undefined as Date | undefined,
    deliveryTime: "",
    duration: "",
    promoCode: "",
    paymentMethod: "",
    newModel: "", // Added for new model input
  })

  const steps = [
    { id: 1, title: "Device Details", description: "Select your device and issues" },
    { id: 2, title: "Service Type", description: "Choose how you want to get it repaired" },
    { id: 3, title: "Duration & Summary", description: "Review and confirm your booking" },
    { id: 4, title: "Payment", description: "Complete your payment" },
  ]

  const [cities, setCities] = useState<{ id: string, name: string, pincodes?: string[] }[]>([])
  const [agents, setAgents] = useState<any[]>([])
  const [citiesLoading, setCitiesLoading] = useState(true)
  const [agentsLoading, setAgentsLoading] = useState(true)
  const [userCity, setUserCity] = useState<string>("")
  const [categories, setCategories] = useState<Category[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  useEffect(() => {
    // Fetch cities
    supabase.from('cities').select('*').then(({ data, error }) => {
      setCities(data || [])
      setCitiesLoading(false)
    })
    // Fetch agents
    supabase.from('agents').select('*').then(({ data, error }) => {
      setAgents(data || [])
      setAgentsLoading(false)
    })
    // Fetch user profile
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserCity(user?.user_metadata?.city || "")
    })
  }, [])

  useEffect(() => {
    setCategoryLoading(true);
    supabase.from('categories').select('*').then(({ data }) => {
      setCategories(data || []);
      setCategoryLoading(false);
    });
  }, []);

  useEffect(() => {
    if (formData.category) {
      setModelLoading(true);
      supabase.from('models').select('*').eq('category_id', formData.category).then(({ data }) => {
        setModels(data || []);
        setModelLoading(false);
      });
    } else {
      setModels([]);
    }
  }, [formData.category]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (formData.images.length + files.length > 5) {
      toast({ title: "Error", description: "Maximum 5 images allowed", variant: "destructive" })
      return
    }
    // Upload images to Supabase Storage
    const uploadedUrls: string[] = []
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const filePath = `booking-images/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const { data, error } = await supabase.storage.from('booking-images').upload(filePath, file)
      if (error) {
        toast({ title: "Error", description: `Failed to upload image: ${file.name}`, variant: "destructive" })
        continue
      }
      const { data: publicUrlData } = supabase.storage.from('booking-images').getPublicUrl(filePath)
      uploadedUrls.push(publicUrlData.publicUrl)
    }
    setFormData({ ...formData, images: [...formData.images, ...uploadedUrls] })
  }

  const removeImage = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index)
    setFormData({ ...formData, images: newImages })
  }

  const handleFaultToggle = (fault: string) => {
    const newFaults = formData.faults.includes(fault)
      ? formData.faults.filter((f) => f !== fault)
      : [...formData.faults, fault]
    setFormData({ ...formData, faults: newFaults })
  }

  const getAvailableTimes = () => {
    const times = []
    for (let hour = 9; hour <= 18; hour++) {
      times.push(`${hour.toString().padStart(2, "0")}:00`)
      if (hour < 18) {
        times.push(`${hour.toString().padStart(2, "0")}:30`)
      }
    }
    return times
  }

  const getMinDate = () => {
    const today = new Date()
    return today
  }

  const getMaxDate = () => {
    const today = new Date()
    const maxDate = new Date(today)
    maxDate.setDate(today.getDate() + 2)
    return maxDate
  }

  const calculatePrice = () => {
    let basePrice = 2000
    if (formData.duration === "express") basePrice += 1000
    if (formData.duration === "standard") basePrice += 500
    return basePrice
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      // Insert booking into Supabase
      const { data, error } = await supabase.from('bookings').insert([
        { ...formData, images: formData.images }
      ])
      if (error) throw error
      const bookingId = (data as any)?.[0]?.id
      toast({ title: "Success", description: `Repair booked successfully! Booking ID: ${bookingId}` })
      router.push(`/customer/book-repair/confirmation?bookingId=${bookingId}`)
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to book repair. Please try again.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.category && formData.brand && formData.model && formData.faults.length > 0
      case 2:
        if (formData.serviceType === "local") {
          return formData.selectedAgent
        } else if (formData.serviceType === "collection") {
          return (
            formData.selectedAgent &&
            formData.address &&
            formData.pincode &&
            formData.collectionDate !== undefined &&
            formData.collectionTime &&
            formData.deliveryDate !== undefined &&
            formData.deliveryTime
          )
        } else if (formData.serviceType === "postal") {
          return formData.address && formData.pincode && formData.city
        }
        return false
      case 3:
        return formData.duration
      case 4:
        return formData.paymentMethod
      default:
        return false
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/customer/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Book Device Repair</h1>
            <p className="text-muted-foreground">Get your device repaired by expert technicians</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground text-muted-foreground"
                }`}
              >
                {currentStep > step.id ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <div className="ml-3 hidden sm:block">
                <p
                  className={`text-sm font-medium ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-4 ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1].title}</CardTitle>
            <CardDescription>{steps[currentStep - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Device Details */}
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {/* Device Category */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Device Category</Label>
                  <Select value={formData.category} onValueChange={val => setFormData(f => ({ ...f, category: val, model: "" }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={categoryLoading ? "Loading..." : "Select category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Brand Selection */}
                {formData.category && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Brand</Label>
                    <Select
                      value={formData.brand}
                      onValueChange={(value) => setFormData({ ...formData, brand: value, model: "" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* This part needs to be dynamic based on the selected category */}
                        {/* For now, it's a placeholder, as models are fetched dynamically */}
                        {/* When a category is selected, fetch models for that category */}
                        {/* For now, it will be empty until models are fetched */}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Model Selection */}
                {formData.category && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Model</Label>
                    <Select
                      value={formData.model === "__new__" ? "__new__" : formData.model}
                      onValueChange={val => setFormData(f => ({ ...f, model: val }))}
                      disabled={!formData.category || modelLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={modelLoading ? "Loading..." : "Select model"} />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map(model => (
                          <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                        ))}
                        <SelectItem value="__new__">Add new model...</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.model === "__new__" && (
                  <Input
                    placeholder="Enter new model name"
                    value={formData.newModel || ""}
                    onChange={e => setFormData(f => ({ ...f, newModel: e.target.value }))}
                  />
                )}

                {/* Fault Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    What's wrong with your device? (Select all that apply)
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {commonFaults.map((fault) => (
                      <div key={fault} className="flex items-center space-x-2">
                        <Checkbox
                          id={fault}
                          checked={formData.faults.includes(fault)}
                          onCheckedChange={() => handleFaultToggle(fault)}
                        />
                        <Label htmlFor={fault} className="text-sm">
                          {fault}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Fault */}
                <div className="space-y-3">
                  <Label htmlFor="customFault">Additional Details (Optional)</Label>
                  <Textarea
                    id="customFault"
                    placeholder="Describe any additional issues or specific details..."
                    value={formData.customFault}
                    onChange={(e) => setFormData({ ...formData, customFault: e.target.value })}
                  />
                </div>

                {/* Image Upload */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Upload Images (Max 5)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <div className="flex text-sm text-muted-foreground">
                        <label
                          htmlFor="file-upload"
                          className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80"
                        >
                          <span>Upload images</span>
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 10MB each</p>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {formData.images.map((image: string, index: number) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-20 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 2: Service Type */}
            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {/* Service Type Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Choose Service Type</Label>
                  <RadioGroup
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                  >
                    <div className="space-y-4">
                      {/* Local Dropoff */}
                      <div
                        className={`border rounded-lg p-4 ${formData.serviceType === "local" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="local" id="local" />
                          <Label htmlFor="local" className="font-medium">
                            Local Dropoff
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Drop off your device at a nearby repair center
                        </p>
                      </div>

                      {/* Collection & Delivery */}
                      <div
                        className={`border rounded-lg p-4 ${formData.serviceType === "collection" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="collection" id="collection" />
                          <Label htmlFor="collection" className="font-medium">
                            Collection & Delivery
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          We'll collect from your address and deliver back
                        </p>
                      </div>

                      {/* Postal Service */}
                      <div
                        className={`border rounded-lg p-4 ${formData.serviceType === "postal" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="postal" id="postal" />
                          <Label htmlFor="postal" className="font-medium">
                            Postal Service
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Send your device by post (Admin will assign agent)
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Agent Selection for Local Dropoff and Collection */}
                {(formData.serviceType === "local" || formData.serviceType === "collection") && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Select Repair Center</Label>
                    <div className="space-y-3">
                      {agentsLoading ? (
                        <div>Loading agents...</div>
                      ) : agents.length === 0 ? (
                        <div>No agents available.</div>
                      ) : (
                        agents
                          .filter(agent => (formData.serviceType === "local" || formData.serviceType === "collection") ? agent.city?.name === userCity : true)
                          .map((agent) => (
                            <div
                              key={agent._id}
                              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                formData.selectedAgent === agent._id
                                  ? "border-primary bg-primary/5"
                                  : "border-muted hover:border-primary/50"
                              }`}
                              onClick={() => setFormData({ ...formData, selectedAgent: agent._id })}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">{agent.shopName || agent.name}</h3>
                                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {agent.shopAddress?.city || agent.city?.name || agent.city}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium">{agent.rating?.average || agent.rating || "N/A"}</span>
                                      <span className="text-yellow-500 ml-1">★</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">({agent.reviews?.length || 0} reviews)</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                )}

                {/* Address Details for Collection & Delivery */}
                {formData.serviceType === "collection" && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Collection & Delivery Address</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Textarea
                          id="address"
                          placeholder="Enter your full address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="pincode">Pincode</Label>
                          <Input
                            id="pincode"
                            placeholder="Enter pincode"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Select
                            value={formData.city}
                            onValueChange={(value) => setFormData({ ...formData, city: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent>
                              {citiesLoading ? (
                                <div>Loading cities...</div>
                              ) : cities.length === 0 ? (
                                <div>No cities available.</div>
                              ) : (
                                cities.map((city) => (
                                  <SelectItem key={city.id} value={city.name}>
                                    {city.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Collection Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Collection Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.collectionDate ? format(formData.collectionDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.collectionDate}
                              onSelect={(date) => setFormData({ ...formData, collectionDate: date })}
                              disabled={(date) => date < getMinDate() || date > getMaxDate()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="collectionTime">Collection Time</Label>
                        <Select
                          value={formData.collectionTime}
                          onValueChange={(value) => setFormData({ ...formData, collectionTime: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTimes().map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Delivery Date & Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Delivery Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.deliveryDate ? format(formData.deliveryDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.deliveryDate}
                              onSelect={(date) => setFormData({ ...formData, deliveryDate: date })}
                              disabled={(date) => date < getMinDate() || date > getMaxDate()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deliveryTime">Delivery Time</Label>
                        <Select
                          value={formData.deliveryTime}
                          onValueChange={(value) => setFormData({ ...formData, deliveryTime: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTimes().map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address Details for Postal Service */}
                {formData.serviceType === "postal" && (
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Postal Address</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalAddress">Address</Label>
                        <Textarea
                          id="postalAddress"
                          placeholder="Enter your full address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="postalPincode">Pincode</Label>
                          <Input
                            id="postalPincode"
                            placeholder="Enter pincode"
                            value={formData.pincode}
                            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="postalCity">City</Label>
                          <Select
                            value={formData.city}
                            onValueChange={(value) => setFormData({ ...formData, city: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent>
                              {citiesLoading ? (
                                <div>Loading cities...</div>
                              ) : cities.length === 0 ? (
                                <div>No cities available.</div>
                              ) : (
                                cities.map((city) => (
                                  <SelectItem key={city.id} value={city.name}>
                                    {city.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Note:</strong> For postal service, our admin will assign the best available agent in
                        your city. You'll receive agent details once assigned.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Duration & Summary */}
            {currentStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                {/* Duration Selection */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Repair Duration</Label>
                  <RadioGroup
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                  >
                    <div className="space-y-4">
                      <div
                        className={`border rounded-lg p-4 ${formData.duration === "express" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="express" id="express" />
                            <div>
                              <Label htmlFor="express" className="font-medium">
                                Express (Same Day)
                              </Label>
                              <p className="text-sm text-muted-foreground">Get your device back within 4-6 hours</p>
                            </div>
                          </div>
                          <Badge variant="secondary">+₹1000</Badge>
                        </div>
                      </div>

                      <div
                        className={`border rounded-lg p-4 ${formData.duration === "standard" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="standard" id="standard" />
                            <div>
                              <Label htmlFor="standard" className="font-medium">
                                Standard (1-2 Days)
                              </Label>
                              <p className="text-sm text-muted-foreground">Most popular option with quality service</p>
                            </div>
                          </div>
                          <Badge variant="secondary">+₹500</Badge>
                        </div>
                      </div>

                      <div
                        className={`border rounded-lg p-4 ${formData.duration === "economy" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="economy" id="economy" />
                            <div>
                              <Label htmlFor="economy" className="font-medium">
                                Economy (3-5 Days)
                              </Label>
                              <p className="text-sm text-muted-foreground">Budget-friendly option</p>
                            </div>
                          </div>
                          <Badge variant="secondary">Base Price</Badge>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Promo Code */}
                <div className="space-y-2">
                  <Label htmlFor="promoCode">Promo Code (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="promoCode"
                      placeholder="Enter promo code"
                      value={formData.promoCode}
                      onChange={(e) => setFormData({ ...formData, promoCode: e.target.value })}
                    />
                    <Button variant="outline">Apply</Button>
                  </div>
                </div>

                {/* Summary */}
                <div className="border rounded-lg p-6 bg-muted/50">
                  <h3 className="font-semibold mb-4">Booking Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Device:</span>
                      <span className="font-medium">
                        {formData.brand} {formData.model}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Issues:</span>
                      <span className="font-medium">{formData.faults.join(", ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Type:</span>
                      <span className="font-medium capitalize">{formData.serviceType?.replace("-", " ")}</span>
                    </div>
                    {formData.selectedAgent && (
                      <div className="flex justify-between">
                        <span>Repair Center:</span>
                        <span className="font-medium">
                          {agents.find((a) => a._id === formData.selectedAgent)?.name}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="font-medium capitalize">{formData.duration}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Amount:</span>
                        <span>₹{calculatePrice().toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Payment */}
            {currentStep === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Payment Method</Label>
                  <RadioGroup
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <div className="space-y-4">
                      <div
                        className={`border rounded-lg p-4 ${formData.paymentMethod === "stripe" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="stripe" id="stripe" />
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            <Label htmlFor="stripe" className="font-medium">
                              Pay Online (Stripe)
                            </Label>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Secure payment with credit/debit card</p>
                      </div>

                      <div
                        className={`border rounded-lg p-4 ${formData.paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-muted"}`}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="cash" id="cash" />
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            <Label htmlFor="cash" className="font-medium">
                              Cash on Service
                            </Label>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">Pay when your device is ready</p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Final Summary */}
                <div className="border rounded-lg p-6 bg-primary/5">
                  <h3 className="font-semibold mb-4">Final Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Device:</span>
                      <span>
                        {formData.brand} {formData.model}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service:</span>
                      <span className="capitalize">{formData.serviceType?.replace("-", " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="capitalize">{formData.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment:</span>
                      <span>{formData.paymentMethod === "stripe" ? "Online Payment" : "Cash on Service"}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>₹{calculatePrice().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceed() || isLoading}>
              {isLoading ? "Booking..." : "Confirm Booking"}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
