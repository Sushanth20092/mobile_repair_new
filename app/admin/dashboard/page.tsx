"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Users,
  Wrench,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Eye,
  UserCheck,
  UserX,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Building,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { DashboardLayout } from "@/components/dashboard-layout"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/lib/api"

const deviceCategories = [
  { id: "mobile", name: "Mobile Phones" },
  { id: "tablet", name: "Tablets" },
  { id: "laptop", name: "Laptops" },
  { id: "smartwatch", name: "Smartwatches" },
]

const brands = {
  mobile: ["Apple", "Samsung", "OnePlus", "Xiaomi", "Google", "Oppo", "Vivo"],
  tablet: ["Apple", "Samsung", "Lenovo", "Huawei"],
  laptop: ["Apple", "Dell", "HP", "Lenovo", "Asus"],
  smartwatch: ["Apple", "Samsung", "Fitbit", "Garmin"],
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [agentRequests, setAgentRequests] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [cityFilter, setCityFilter] = useState("all")
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null)
  const [reassignAgent, setReassignAgent] = useState("")
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [deviceForm, setDeviceForm] = useState({ category: "", brand: "", model: "" })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.from('stats').select('*')
        setStats(data?.[0] || null)
        setLoading(false)
      } catch {
        setError("Failed to load dashboard data")
        setLoading(false)
      }
    }
    fetchStats()
    // Subscribe to stats changes if needed
  }, [])

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [agentsRes, agentRequestsRes, bookingsRes] = await Promise.all([
          supabase.from('agents').select('*'),
          supabase.from('agent_applications').select('*').eq('status', 'pending'),
          supabase.from('bookings').select('*'),
        ])
        setAgents(agentsRes.data || [])
        setAgentRequests(agentRequestsRes.data || [])
        setBookings(bookingsRes.data || [])
      } catch {
        setAgents([])
        setAgentRequests([])
        setBookings([])
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
    // Subscribe to agents, agent_applications, and bookings table changes
    const channel = supabase.channel('realtime:admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, (payload) => { fetchAll() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_applications' }, (payload) => { fetchAll() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (payload) => { fetchAll() })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const handleApproveAgent = (requestId: string) => {
    setAgentRequests((requests) =>
      requests.map((request) => (request.id === requestId ? { ...request, status: "approved" } : request)),
    )
    toast({
      title: "Agent Approved",
      description: "Agent request has been approved successfully",
    })
  }

  const handleRejectAgent = (requestId: string) => {
    setAgentRequests((requests) =>
      requests.map((request) => (request.id === requestId ? { ...request, status: "rejected" } : request)),
    )
    toast({
      title: "Agent Rejected",
      description: "Agent request has been rejected",
      variant: "destructive",
    })
  }

  const handleReassignBooking = (bookingId: string) => {
    if (!reassignAgent) {
      toast({
        title: "Error",
        description: "Please select an agent to reassign",
        variant: "destructive",
      })
      return
    }

    setBookings((bookings) =>
      bookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              agentId: reassignAgent,
              agent: agents.find((a) => a.id === reassignAgent)?.name || "Unknown",
              status: "assigned",
            }
          : booking,
      ),
    )

    setSelectedBooking(null)
    setReassignAgent("")

    toast({
      title: "Booking Reassigned",
      description: "Booking has been reassigned successfully",
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "in-progress":
      case "assigned":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
      case "cancelled":
        return <UserX className="h-4 w-4" />
      case "pending":
        return <AlertCircle className="h-4 w-4" />
      case "in-progress":
      case "assigned":
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filteredRequests = agentRequests.filter((request: any) => {
    const matchesSearch =
      request.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.city.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || request.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const filteredBookings = bookings.filter((booking: any) => {
    const matchesSearch =
      booking.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.device.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter
    const matchesCity = cityFilter === "all" || booking.city === cityFilter

    return matchesSearch && matchesStatus && matchesCity
  })

  const handleAddDevice = () => {
    if (!deviceForm.category || !deviceForm.brand || !deviceForm.model) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" })
      return
    }
    // Here you would call your API to add the device
    toast({ title: "Device Added", description: `${deviceForm.brand} ${deviceForm.model} added to ${deviceForm.category}` })
    setShowAddDevice(false)
    setDeviceForm({ category: "", brand: "", model: "" })
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {user?.name}!</h1>
            <p className="text-muted-foreground">Admin dashboard overview and management</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border rounded text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>

        {/* Add Device Button */}
        <div className="flex justify-end">
          <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
            <DialogTrigger asChild>
              <Button variant="default">+ Add Device</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Device</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={deviceForm.category} onValueChange={val => setDeviceForm(f => ({ ...f, category: val, brand: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={deviceForm.brand} onValueChange={val => setDeviceForm(f => ({ ...f, brand: val }))} disabled={!deviceForm.category}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands[deviceForm.category as keyof typeof brands]?.map(brand => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input placeholder="Model name" value={deviceForm.model} onChange={e => setDeviceForm(f => ({ ...f, model: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button onClick={handleAddDevice}>Add Device</Button>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats?.totalUsers?.toLocaleString() ?? 0}</div>
              {/* Optionally add growth if available */}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats?.totalAgents ?? 0}</div>
              <p className="text-xs text-muted-foreground">{loading ? "..." : `${stats?.pendingAgents ?? 0} pending requests`}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "..." : stats?.totalBookings ?? 0}</div>
              <p className="text-xs text-muted-foreground">{loading ? "..." : `${stats?.pendingBookings ?? 0} active, ${stats?.completedBookings ?? 0} completed`}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{loading ? "..." : ((stats?.totalRevenue ?? 0) / 100000).toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">₹{loading ? "..." : (stats?.totalRevenue ?? 0).toLocaleString()} total</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="agent-requests" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="agent-requests">Agent Requests ({loading ? "..." : stats?.pendingAgents ?? 0})</TabsTrigger>
            <TabsTrigger value="bookings">All Bookings</TabsTrigger>
            <TabsTrigger value="cities">City Management</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Agent Requests Tab */}
          <TabsContent value="agent-requests" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>Agent Applications</CardTitle>
                    <CardDescription>Review and manage agent applications</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search agents..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-[200px]"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <p>Loading agent requests...</p>
                  ) : filteredRequests.map((request: any) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{request.name}</h3>
                            <Badge className={getStatusColor(request.status)}>
                              {getStatusIcon(request.status)}
                              <span className="ml-1 capitalize">{request.status}</span>
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                            <p className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              <strong>Shop:</strong> {request.shopName}
                            </p>
                            <p className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              <strong>Email:</strong> {request.email}
                            </p>
                            <p className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              <strong>Phone:</strong> {request.phone}
                            </p>
                            <p className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <strong>City:</strong> {request.city}
                            </p>
                            <p>
                              <strong>Experience:</strong> {request.experience} years
                            </p>
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Applied: {new Date(request.appliedDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Address:</p>
                            <p className="text-sm text-muted-foreground">{request.shopAddress}</p>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">Specializations:</p>
                            <div className="flex flex-wrap gap-1">
                              {request.specializations.map((spec: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <div className="text-right mb-2">
                            <p className="text-xs text-muted-foreground">Application ID: {request.id}</p>
                            {request.approvedDate && (
                              <p className="text-xs text-green-600">
                                Approved: {new Date(request.approvedDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          {request.status === "pending" && (
                            <div className="flex flex-col gap-2">
                              <Button size="sm" onClick={() => handleApproveAgent(request.id)} className="w-full">
                                <UserCheck className="h-3 w-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectAgent(request.id)}
                                className="w-full"
                              >
                                <UserX className="h-3 w-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          <Button size="sm" variant="outline" className="w-full">
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle>All Bookings</CardTitle>
                    <CardDescription>Manage and track all repair bookings</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search bookings..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-[200px]"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Cities</SelectItem>
                        {/* Add city options here */}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <p>Loading bookings...</p>
                  ) : filteredBookings.map((booking: any) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col lg:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{booking.device}</h3>
                            <Badge className={getStatusColor(booking.status)}>
                              {getStatusIcon(booking.status)}
                              <span className="ml-1 capitalize">{booking.status.replace("-", " ")}</span>
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-3">
                            <p>
                              <strong>Customer:</strong> {booking.customer}
                            </p>
                            <p>
                              <strong>Email:</strong> {booking.customerEmail}
                            </p>
                            <p>
                              <strong>Phone:</strong> {booking.customerPhone}
                            </p>
                            <p>
                              <strong>Agent:</strong> {booking.agent}
                            </p>
                            <p>
                              <strong>Issue:</strong> {booking.issue}
                            </p>
                            <p>
                              <strong>Service:</strong> {booking.serviceType}
                            </p>
                            <p>
                              <strong>City:</strong> {booking.city}
                            </p>
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(booking.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <div className="text-right mb-2">
                            <p className="font-semibold">₹{booking.amount.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Booking ID: {booking.id}</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            {booking.status === "pending" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedBooking(booking.id)}
                                className="w-full"
                              >
                                Reassign Agent
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="w-full">
                              <Eye className="h-3 w-3 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Reassign Agent Modal */}
                      {selectedBooking === booking.id && (
                        <div className="mt-4 p-4 border-t bg-muted/50 rounded-b-lg">
                          <h4 className="font-medium mb-3">Reassign to Agent</h4>
                          <div className="flex gap-2">
                            <Select value={reassignAgent} onValueChange={setReassignAgent}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select agent" />
                              </SelectTrigger>
                              <SelectContent>
                                {agents.map((agent: any) => (
                                  <SelectItem key={agent.id} value={agent.id}>
                                    {agent.name} - {agent.city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button size="sm" onClick={() => handleReassignBooking(booking.id)}>
                              Assign
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedBooking(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cities Tab */}
          <TabsContent value="cities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>City Management</CardTitle>
                <CardDescription>Manage service areas and city-wise performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Add city cards here */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Analytics</CardTitle>
                  <CardDescription>Monthly revenue breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>This Month</span>
                      <span className="font-semibold">₹8.5L</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Last Month</span>
                      <span className="font-semibold">₹7.2L</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Growth</span>
                      <span className="font-semibold text-green-600">+18.1%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Service Type Distribution</CardTitle>
                  <CardDescription>Breakdown by service type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Local Dropoff</span>
                      <span className="font-semibold">45%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Collection & Delivery</span>
                      <span className="font-semibold">35%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Postal Service</span>
                      <span className="font-semibold">20%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">4.8</div>
                    <div className="text-sm text-muted-foreground">Avg Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">2.3</div>
                    <div className="text-sm text-muted-foreground">Avg Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">94%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">89%</div>
                    <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
