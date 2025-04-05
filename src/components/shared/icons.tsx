"use client";

import {
<<<<<<< Updated upstream
  AlertCircle,
=======
  AlertTriangle,
  ArrowLeft,
>>>>>>> Stashed changes
  ArrowRight,
  Building,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
<<<<<<< Updated upstream
  Clock,
  CreditCard,
=======
  ChevronUp,
  Command,
  DollarSign,
  Eye,
  EyeOff,
  Facebook,
>>>>>>> Stashed changes
  File,
  FileText,
  Globe,
  HelpCircle,
<<<<<<< Updated upstream
  Home,
  Image as ImageIcon,
  Inbox,
  Loader2,
  LucideProps,
=======
  Image,
  Info,
  Laptop,
  Loader2,
  Lock,
>>>>>>> Stashed changes
  Moon,
  MoreVertical,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Sun,
  Trash,
  Twitter,
  User,
  X,
<<<<<<< Updated upstream
  Menu,
  Bell,
  LogOut,
  Mail,
  MessageSquare,
  Store,
  Truck,
  Users,
  Calendar,
  Building,
  MapPin,
  Info,
  Filter,
  ArrowUpDown,
  LayoutDashboard,
} from "lucide-react";

export type Icon = typeof AlertCircle;

export const Icons = {
  // Navigation
  home: Home,
  arrowRight: ArrowRight,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  menu: Menu,
  
  // User
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
  
  // Notifications & Messages
  bell: Bell,
  mail: Mail,
  message: MessageSquare,
  
  // Content
  file: File,
  fileText: FileText,
  image: ImageIcon,
  
  // UI Elements
  loader: Loader2,
  search: Search,
  plus: Plus,
  moreVertical: MoreVertical,
  trash: Trash,
  x: X,
  sun: Sun,
  moon: Moon,
  star: Star,
  filter: Filter,
  arrowUpDown: ArrowUpDown,
  
  // Feedback
  alertCircle: AlertCircle,
  helpCircle: HelpCircle,
  
  // Misc
  inbox: Inbox,
  check: Check,
  clock: Clock,
  calendar: Calendar,
  creditCard: CreditCard,
  building: Building,
  mapPin: MapPin,
  info: Info,
  
  // Social
  twitter: Twitter,
  
  // Spinner
  spinner: (props: LucideProps) => (
    <Loader2 {...props} className={`animate-spin ${props.className || ""}`} />
  ),
}; 
=======
  Bike,
  ShoppingBag,
  Wrench,
  Upload
} from "lucide-react";

export type Icon = typeof Command;

export const Icons = {
  logo: Command,
  close: X,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  trash: Trash,
  user: User,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  help: HelpCircle,
  pizza: Pizza,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  settings: Settings,
  billing: MoreVertical,
  ellipsis: MoreVertical,
  add: Plus,
  warning: AlertTriangle,
  twitter: Twitter,
  check: Check,
  bicycle: Bike,
  store: ShoppingBag,
  tool: Wrench,
  upload: Upload,
  fileText: FileText,
  file: File,
  image: Image,
  package: Package,
  google: User,
  facebook: Facebook,
  globe: Globe,
  eyeOff: EyeOff,
  eye: Eye,
  info: Info,
  x: X,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  dollarSign: DollarSign,
  lock: Lock,
  building: Building,
} as const;
>>>>>>> Stashed changes
