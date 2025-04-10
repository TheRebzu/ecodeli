"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Bell,
  Bike,
  Building,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Command,
  CreditCard,
  DollarSign,
  Eye,
  EyeOff,
  Facebook,
  File,
  FileText,
  Filter,
  Globe,
  HelpCircle,
  Home,
  Image,
  Inbox,
  Info,
  Laptop,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  LucideProps,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Moon,
  MoreVertical,
  Package,
  Pizza,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Sun,
  SunMedium,
  Trash,
  Truck,
  Twitter,
  Upload,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react";

export type Icon = typeof Command;

export const Icons = {
  // Logo & Navigation
  logo: Command,
  home: Home,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  menu: Menu,
  
  // User related
  user: User,
  users: Users,
  logout: LogOut,
  settings: Settings,
  
  // Dashboard
  dashboard: LayoutDashboard,
  
  // Commerce
  cart: ShoppingCart,
  store: Store,
  truck: Truck,
  package: Package,
  shoppingBag: ShoppingBag,
  
  // Notifications & Messages
  bell: Bell,
  mail: Mail,
  message: MessageSquare,
  
  // Content
  file: File,
  fileText: FileText,
  image: Image,
  
  // UI Elements
  loader: Loader2,
  search: Search,
  plus: Plus,
  moreVertical: MoreVertical,
  trash: Trash,
  close: X,
  x: X,
  sun: Sun,
  sunMedium: SunMedium,
  moon: Moon,
  star: Star,
  filter: Filter,
  arrowUpDown: ArrowUpDown,
  ellipsis: MoreVertical,
  add: Plus,
  
  // Feedback
  alertCircle: AlertCircle,
  alertTriangle: AlertTriangle,
  helpCircle: HelpCircle,
  warning: AlertTriangle,
  
  // Misc
  inbox: Inbox,
  check: Check,
  clock: Clock,
  calendar: Calendar,
  creditCard: CreditCard,
  building: Building,
  mapPin: MapPin,
  info: Info,
  billing: MoreVertical,
  laptop: Laptop,
  lock: Lock,
  pizza: Pizza,
  tool: Wrench,
  bicycle: Bike,
  upload: Upload,
  dollarSign: DollarSign,
  eye: Eye,
  eyeOff: EyeOff,
  
  // Social
  twitter: Twitter,
  facebook: Facebook,
  google: User,
  globe: Globe,
  
  // Spinner
  spinner: (props: LucideProps) => (
    <Loader2 {...props} className={`animate-spin ${props.className || ""}`} />
  ),
};
