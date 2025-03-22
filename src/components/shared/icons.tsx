import {
  AlertCircle,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  File,
  FileText,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Inbox,
  Loader2,
  LucideProps,
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