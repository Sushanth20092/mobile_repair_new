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
type Brand = { id: string; name: string; category_id: string };

// Add new type for Fault
interface Fault {
  id: string;
  name: string;
  price: number;
}

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
    city_id: "",
    collectionDate: undefined as Date | undefined,
    collectionTime: "",
    deliveryDate: undefined as Date | undefined,
    deliveryTime: "",
    duration: "",
    promoCode: "",
    paymentMethod: "",
    newModel: "", // Added for new model input
    customModel: "", // Added for custom model input
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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  // Add models state
  const [models, setModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  // Add state for faults fetched from Supabase
  const [faults, setFaults] = useState<Fault[]>([]);
  const [faultsLoading, setFaultsLoading] = useState(false);
  // Add state for selected deviceId (model selection should yield deviceId)
  const [deviceId, setDeviceId] = useState<string>("");
  // 1. Add a new state for user profile (to get city_id)
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    // Fetch cities
    supabase.from('cities').select('*').then(({ data, error }) => {
      setCities(data || [])
      setCitiesLoading(false)
    })
    // Fetch user profile (to get city_id)
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        // Fetch from profiles table using user.id
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        setUserProfile(profile);
        setUserCity(profile?.city_id || "");
        // Fetch agents only after getting city_id
        if (profile?.city_id) {
          setAgentsLoading(true);
          supabase
            .from('agents')
            .select('*')
            .eq('city_id', profile.city_id)
            .eq('status', 'approved')
            .eq('is_online', true)
            .then(({ data, error }) => {
              setAgents(data || []);
              setAgentsLoading(false);
            });
        } else {
          setAgents([]);
          setAgentsLoading(false);
        }
      } else {
        setUserProfile(null);
        setUserCity("");
        setAgents([]);
        setAgentsLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    setCategoryLoading(true);
    supabase.from('categories').select('*').then(({ data }) => {
      setCategories(data || []);
      setCategoryLoading(false);
    });
  }, []);

  useEffect(() => {
    if (formData.category) {
      setBrandLoading(true);
      supabase.from('brands').select('*').eq('category_id', formData.category).then(({ data }) => {
        setBrands(data || []);
        setBrandLoading(false);
      });
    } else {
      setBrands([]);
    }
  }, [formData.category]);

  // Fetch models when category and brand are selected
  useEffect(() => {
    if (formData.category && formData.brand) {
      setModelsLoading(true);
      fetch(`/api/devices?category_id=${formData.category}&brand_id=${formData.brand}`)
        .then(res => res.json())
        .then(data => {
          setModels(data.models || []);
          setModelsLoading(false);
        })
        .catch(() => {
          setModels([]);
          setModelsLoading(false);
        });
    } else {
      setModels([]);
    }
  }, [formData.category, formData.brand]);

  // Fetch deviceId when model is selected
  useEffect(() => {
    if (formData.category && formData.brand && formData.model) {
      // Fetch the deviceId for the selected model
      supabase
        .from('devices')
        .select('id')
        .eq('category_id', formData.category)
        .eq('brand_id', formData.brand)
        .eq('model', formData.model)
        .maybeSingle()
        .then(({ data }) => {
          setDeviceId(data?.id || "");
        });
    } else {
      setDeviceId("");
    }
  }, [formData.category, formData.brand, formData.model]);

  // Fetch faults when deviceId changes
  useEffect(() => {
    if (deviceId) {
      setFaultsLoading(true);
      supabase
        .from('faults')
        .select('id, name, price')
        .eq('device_id', deviceId)
        .eq('is_active', true)
        .then(({ data }) => {
          setFaults(data || []);
          setFaultsLoading(false);
        });
    } else {
      setFaults([]);
    }
  }, [deviceId]);

  // Selected faults state: array of Fault objects
  const [selectedFaults, setSelectedFaults] = useState<Fault[]>([]);

  // Handle fault checkbox toggle
  const handleFaultToggle = (fault: Fault) => {
    const exists = selectedFaults.some(f => f.id === fault.id);
    setSelectedFaults(exists
      ? selectedFaults.filter(f => f.id !== fault.id)
      : [...selectedFaults, fault]
    );
  };

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

  // Update handleSubmit to save selectedFaults in the booking
  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // Insert booking into Supabase
      const { data, error } = await supabase.from('bookings').insert([
        {
          ...formData,
          agent_id: formData.selectedAgent || null,
          images: formData.images,
          device_id: deviceId,
          faults: selectedFaults.map(f => ({ id: f.id, name: f.name, price: f.price })),
        }
      ]);
      if (error) throw error;
      const bookingId = (data as any)?.[0]?.id;
      toast({ title: "Success", description: `Repair booked successfully! Booking ID: ${bookingId}` });
      router.push(`/customer/book-repair/confirmation?bookingId=${bookingId}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to book repair. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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
        return formData.category && formData.brand && formData.model && selectedFaults.length > 0
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
          return formData.address && formData.pincode && formData.city_id
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
                        {brands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Model Selection */}
                {formData.category && formData.brand && (
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Model</Label>
                    <Select
                      value={formData.model}
                      onValueChange={val => setFormData(f => ({ ...f, model: val }))}
                      disabled={!formData.category || !formData.brand}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelsLoading ? (
                          <div>Loading models...</div>
                        ) : models.length === 0 ? (
                          <div>No models found.</div>
                        ) : (
                          models.map(model => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.model === "custom" && (
                  <Input
                    placeholder="Enter your device model"
                    value={formData.customModel || ""}
                    onChange={e => setFormData(f => ({ ...f, customModel: e.target.value }))}
                  />
                )}

                {/* Fault Selection (dynamic) */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">
                    What's wrong with your device? (Select all that apply)
                  </Label>
                  {faultsLoading ? (
                    <div>Loading faults...</div>
                  ) : faults.length === 0 ? (
                    <div>No faults found for this device.</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {faults.map((fault) => (
                        <div key={fault.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={fault.id}
                            checked={selectedFaults.some(f => f.id === fault.id)}
                            onCheckedChange={() => handleFaultToggle(fault)}
                          />
                          <Label htmlFor={fault.id} className="text-sm">
                            {fault.name} <span className="ml-2 text-muted-foreground">₹{fault.price}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom Fault (optional, unchanged) */}
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
                        {/* Agent List or Fallback Message (directly below Local Dropoff) */}
                        {formData.serviceType === "local" && (
                          <div className="mt-4 space-y-4">
                            <Label className="text-base font-medium">Select Repair Center</Label>
                            <div className="space-y-3">
                              {agentsLoading ? (
                                <div>Loading agents...</div>
                              ) : agents.length === 0 ? (
                                <div className="text-muted-foreground">No agents are currently available for local dropoff in your area.</div>
                              ) : (
                                agents.map((agent) => (
                                  <div
                                    key={agent.id}
                                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                      formData.selectedAgent === agent.id
                                        ? "border-primary bg-primary/5"
                                        : "border-muted hover:border-primary/50"
                                    }`}
                                    onClick={() => setFormData({ ...formData, selectedAgent: agent.id })}
                                  >
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                                      <div>
                                        <h3 className="font-medium text-lg">{agent.name}</h3>
                                        <div className="text-sm text-muted-foreground mb-1">
                                          {agent.shop_name} <span className="mx-2">|</span> {agent.shop_address_street}, {agent.shop_address_pincode}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-1">
                                          {Array.isArray(agent.specializations) && agent.specializations.length > 0 && (agent.specializations as string[]).map((spec: string, idx: number) => (
                                            <span key={idx} className="inline-block bg-muted px-2 py-0.5 rounded text-xs">{spec}</span>
                                          ))}
                                        </div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1 min-w-[120px]">
                                        <div className="flex items-center gap-1 text-sm">
                                          <span className="text-yellow-500">★</span>
                                          <span className="font-semibold">{agent.rating_average ? agent.rating_average.toFixed(1) : 'N/A'}</span>
                                          <span className="text-muted-foreground">({agent.rating_count || 0} reviews)</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground">{agent.completed_jobs || 0} jobs completed</div>
                                        {agent.last_seen && (
                                          <div className="text-xs text-muted-foreground">Last seen: {new Date(agent.last_seen).toLocaleString()}</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Collection & Delivery (unchanged) */}
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
                      {/* Postal Service (unchanged) */}
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
                {/* Restore the original address/date/city input forms for 'collection' and 'postal' below the RadioGroup, only when those service types are selected */}
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
                            value={formData.city_id}
                            onValueChange={(value) => setFormData({ ...formData, city_id: value })}
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
                                  <SelectItem key={city.id} value={city.id}>
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
                            value={formData.city_id}
                            onValueChange={(value) => setFormData({ ...formData, city_id: value })}
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
                                  <SelectItem key={city.id} value={city.id}>
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
                      <span className="font-medium">{selectedFaults.map(f => f.name).join(", ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Type:</span>
                      <span className="font-medium capitalize">{formData.serviceType?.replace("-", " ")}</span>
                    </div>
                    {formData.selectedAgent && (
                      <div className="flex justify-between">
                        <span>Repair Center:</span>
                        <span className="font-medium">
                          {agents.find((a) => a.id === formData.selectedAgent)?.name}
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
