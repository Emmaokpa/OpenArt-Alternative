import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  Clapperboard,
  Crop,
  Film,
  Home,
  Image as ImageIcon,
  Languages,
  Layers,
  LayoutGrid,
  Mic,
  Music,
  Package,
  RefreshCw,
  Repeat,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Sun,
  UserRound,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Image helper                                                       */
/* ------------------------------------------------------------------ */

const px = (id: number, w = 1200, h = 627) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${h}`;

const art = (id: number) => px(id, 800, 1200);
const wide = (id: number) => px(id, 940, 650);

const POOL = [
  31419072, 8004014, 27353350, 6220846, 8493475, 33722866, 38087236, 24589327,
  9831878, 6415466, 36364968, 6404185, 14605645, 18386912, 1350461, 13143622,
  29477188, 4913538, 16756716, 5371481, 16677542, 34963107, 28996070, 6153179,
  33442715, 7661601, 5371473, 10519044, 9363611, 4355348, 11508536, 6220701,
  13588896, 35892092, 6270136, 11003194, 30947859, 16299830, 7170704, 8134821,
];

const imgs = (start: number, count = 5) =>
  POOL.slice(start, start + count).map((id) => px(id, 520, 420));

/* ------------------------------------------------------------------ */
/*  Direct Your Video                                                  */
/* ------------------------------------------------------------------ */

export type DirectVideoItem = {
  id: string;
  label: string;
  image: string;
  icon: LucideIcon;
  badge?: string;
};

export const directVideoItems: DirectVideoItem[] = [
  { id: "launch", label: "Launch Video", image: px(8004014), icon: Rocket, badge: "New" },
  { id: "short-film", label: "Short Film", image: px(33722866), icon: Clapperboard },
  { id: "music-video", label: "Music Video", image: px(9831878), icon: Music },
  { id: "real-estate", label: "Real Estate", image: px(8134821), icon: Home },
  { id: "product-ads", label: "Product Ads", image: px(27353350), icon: Package },
  { id: "ad-remake", label: "Ad Remake", image: px(6220846), icon: RefreshCw },
  { id: "social", label: "Social Content", image: px(8493475), icon: Smartphone },
  { id: "ugc", label: "UGC Ads", image: px(6415466), icon: UserRound },
  { id: "micro-drama", label: "Micro Drama", image: art(35171242), icon: Film },
  { id: "brand-film", label: "Brand Film", image: px(7170704), icon: Briefcase },
  { id: "explainer", label: "Explainer", image: wide(16299830), icon: BookOpen },
  { id: "trailer", label: "Film Trailer", image: px(4355348), icon: Sparkles },
];

/* ------------------------------------------------------------------ */
/*  What's New                                                         */
/* ------------------------------------------------------------------ */

export type NewsItem = {
  id: string;
  title: string;
  image: string;
  badge: "Upgrade Now" | "Try Now";
};

export const whatsNewItems: NewsItem[] = [
  {
    id: "gpt-image",
    title: "30% Off GPT Image 2.6 Until Nov 17.",
    image: wide(36364968),
    badge: "Upgrade Now",
  },
  {
    id: "seedream",
    title: "50% Off Seedream 5.5 Until Nov 23.",
    image: px(6404185),
    badge: "Upgrade Now",
  },
  {
    id: "kling",
    title: "50% Off Kling 4 Until Nov 20.",
    image: px(14605645),
    badge: "Upgrade Now",
  },
  {
    id: "recraft",
    title: "30% Off All Recraft V4.1 models until Nov 22",
    image: wide(18386912),
    badge: "Upgrade Now",
  },
  {
    id: "launch-video",
    title: "Create a launch video for your product",
    image: px(1350461),
    badge: "Try Now",
  },
  {
    id: "ip-safety",
    title: "IP Safety Check: Scan for potential copyright issues",
    image: px(13143622),
    badge: "Try Now",
  },
];

/* ------------------------------------------------------------------ */
/*  Viral Seedance presets                                             */
/* ------------------------------------------------------------------ */

export type PresetItem = {
  id: string;
  title: string;
  image: string;
  /** CSS aspect-ratio value e.g. "4 / 5" */
  aspect: string;
  model: string;
};

export const presets: PresetItem[] = [
  { id: "sunset-heist", title: "Sunset Heist", image: px(31419072), aspect: "16 / 10", model: "Seedance 2.5" },
  { id: "dragon-raid", title: "Dragon Raid", image: px(27353350), aspect: "1 / 1", model: "Seedance 2.5" },
  { id: "dream-sequel", title: "Dream Sequel", image: px(9831878), aspect: "4 / 3", model: "Seedance 2.5" },
  { id: "arcade-knockout", title: "Arcade Knockout", image: px(8493475), aspect: "4 / 5", model: "Seedance 2.5" },
  { id: "roadstar", title: "Roadstar", image: px(24589327), aspect: "3 / 4", model: "Seedance 2.5" },
  { id: "midnight-lobby", title: "Midnight Lobby", image: wide(38087236), aspect: "1 / 1", model: "Seedance 2.5" },
  { id: "skeleton", title: "Spooky Scary Skeleton", image: art(34963107), aspect: "4 / 5", model: "Seedance 2.0" },
  { id: "scare-to-selfie", title: "Scare to Selfie", image: px(5371481), aspect: "4 / 3", model: "Seedance 2.5" },
  { id: "trick-or-treat", title: "Trick-or-Treat Paws", image: px(28996070), aspect: "16 / 10", model: "Seedance 2.5" },
  { id: "halloween", title: "Halloween Fan Transition", image: px(11003194), aspect: "3 / 4", model: "Seedance 2.5" },
];

/* ------------------------------------------------------------------ */
/*  Get Started with Tools                                             */
/* ------------------------------------------------------------------ */

export type ToolItem = {
  id: string;
  title: string;
  description: string;
  /** Substring of `description` rendered with an accent, for emphasis. */
  highlight?: string;
  icon: LucideIcon;
  isNew?: boolean;
  tint: string;
};

export const tools: ToolItem[] = [
  {
    id: "smart-shot",
    title: "Smart Shot",
    description: "One line in. A full storyboard out — then the cinematic cut.",
    highlight: "the cinematic cut",
    icon: LayoutGrid,
    tint: "from-violet-500/25 to-violet-500/5",
  },
  {
    id: "resize-video",
    title: "Resize Video",
    description: "Reframe any clip to 9:16, 1:1 or 16:9 in a single click.",
    highlight: "in a single click",
    icon: Crop,
    isNew: true,
    tint: "from-cyan-500/25 to-cyan-500/5",
  },
  {
    id: "dub-video",
    title: "Dub Video",
    description: "Speak to 24 languages with lip sync that actually lands.",
    highlight: "24 languages",
    icon: Languages,
    isNew: true,
    tint: "from-emerald-500/25 to-emerald-500/5",
  },
  {
    id: "extract-layers",
    title: "Extract layers",
    description: "Break any image into clean, editable layers.",
    highlight: "editable layers",
    icon: Layers,
    isNew: true,
    tint: "from-amber-500/25 to-amber-500/5",
  },
  {
    id: "ip-safety",
    title: "IP Safety Check",
    description: "Scan every frame for IP matches before you publish.",
    highlight: "before you publish",
    icon: ShieldCheck,
    isNew: true,
    tint: "from-sky-500/25 to-sky-500/5",
  },
  {
    id: "replace-background",
    title: "Replace Background",
    description: "Drop in a new world behind your subject — light intact.",
    highlight: "light intact",
    icon: ImageIcon,
    tint: "from-teal-500/25 to-teal-500/5",
  },
  {
    id: "relight",
    title: "Relight Video",
    description: "Match any shot's lighting to a reference in one pass.",
    highlight: "in one pass",
    icon: Sun,
    tint: "from-orange-500/25 to-orange-500/5",
  },
  {
    id: "swap-anything",
    title: "Swap Anything",
    description: "Move your subject into any video's motion, cleanly.",
    highlight: "any video's motion",
    icon: Repeat,
    isNew: true,
    tint: "from-indigo-500/25 to-indigo-500/5",
  },
  {
    id: "lip-sync",
    title: "Lip-Sync",
    description: "Pair a still photo with an audio track. That's it.",
    highlight: "That's it",
    icon: Mic,
    tint: "from-lime/25 to-lime/5",
  },
];

/* ------------------------------------------------------------------ */
/*  Latest AI Models                                                   */
/* ------------------------------------------------------------------ */

export type ModelItem = {
  id: string;
  name: string;
  description: string;
  image: string;
};

export const models: ModelItem[] = [
  {
    id: "seedream",
    name: "Seedream 5.5",
    description: "Create more marketing assets from one product image for less",
    image: wide(36364968),
  },
  {
    id: "gpt-image",
    name: "GPT Image 2.6",
    description: "Higher quality + Editable SVG and GIF outputs",
    image: wide(18386912),
  },
  {
    id: "kling",
    name: "Kling 4",
    description: "Consistent characters, precise camera moves, and targeted video edits.",
    image: wide(14605645),
  },
  {
    id: "seedance",
    name: "Seedance 2.5",
    description: "30s videos. Frame level editing. Highest Details",
    image: wide(6404185),
  },
];

/* ------------------------------------------------------------------ */
/*  Inspirations                                                       */
/* ------------------------------------------------------------------ */

export type InspirationCategory = {
  id: string;
  title: string;
  description: string;
  images: string[];
};

export const inspirations: InspirationCategory[] = [
  {
    id: "marketing",
    title: "Marketing and Advertising",
    description: "Campaign clips, product shots, and style visuals for brands and sellers",
    images: imgs(0),
  },
  {
    id: "film",
    title: "Film & Stories",
    description: "Cinematic scenes, stills, and storyboards",
    images: imgs(5),
  },
  {
    id: "music",
    title: "Music Video",
    description: "Visualizers, lyric videos, and album art",
    images: imgs(10),
  },
  {
    id: "animation",
    title: "Animation & Illustration",
    description: "Character-driven stories, anime, illustration, and 3D art",
    images: imgs(15),
  },
  {
    id: "ugc",
    title: "UGC",
    description: "AI Influencer, UGC, Social Media Content",
    images: imgs(20),
  },
  {
    id: "micro-drama",
    title: "Micro Drama",
    description: "Intense melodrama, shocking twists, and cliffhangers",
    images: imgs(25),
  },
  {
    id: "anime",
    title: "Anime",
    description: "Anime-style portraits and videos, characters",
    images: imgs(30),
  },
  {
    id: "explainer",
    title: "Explainer",
    description: "Videos to explain a product, service or a concept",
    images: imgs(35),
  },
];

/* ------------------------------------------------------------------ */
/*  Prompt suggestions                                                 */
/* ------------------------------------------------------------------ */

export const placeholderPrompts = [
  "A 30-second launch film for a new sneaker, slow orbit, neon rim light",
  "A cinematic trailer for a sci-fi short film set on Mars",
  "15-second UGC ad for a skincare brand, handheld, natural light",
  "Neon-lit music video, slow dolly through a rainy Tokyo street",
  "Real estate walkthrough of a modern glass house at golden hour",
];
