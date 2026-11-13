import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  Film,
  Globe,
  Home,
  Music,
  Package,
  RefreshCw,
  Rocket,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Direct Your Video                                                  */
/* ------------------------------------------------------------------ */

export type DirectVideoItem = {
  id: string;
  label: string;
  image: string;
  icon: LucideIcon;
  badge?: string;
  highlighted?: boolean;
};

export const directVideoItems: DirectVideoItem[] = [
  {
    id: "launch",
    label: "Launch Video",
    image:
      "https://images.pexels.com/photos/8004014/pexels-photo-8004014.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    icon: Rocket,
    badge: "New",
    highlighted: true,
  },
  {
    id: "short-film",
    label: "Short Film",
    image:
      "https://images.pexels.com/photos/33722866/pexels-photo-33722866.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    icon: Clapperboard,
  },
  {
    id: "music-video",
    label: "Music Video",
    image:
      "https://images.pexels.com/photos/9831878/pexels-photo-9831878.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    icon: Music,
  },
  {
    id: "real-estate",
    label: "Real Estate",
    image:
      "https://images.pexels.com/photos/8134821/pexels-photo-8134821.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    icon: Home,
  },
  {
    id: "product-ads",
    label: "Product Ads",
    image:
      "https://images.pexels.com/photos/27353350/pexels-photo-27353350.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    icon: Package,
  },
  {
    id: "ad-remake",
    label: "Ad Remake",
    image:
      "https://images.pexels.com/photos/6220846/pexels-photo-6220846.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    icon: RefreshCw,
  },
  {
    id: "social",
    label: "Social Content",
    image:
      "https://images.pexels.com/photos/8493475/pexels-photo-8493475.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    icon: Smartphone,
  },
  {
    id: "ugc",
    label: "UGC Ads",
    image:
      "https://images.pexels.com/photos/6415466/pexels-photo-6415466.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    icon: UserRound,
  },
  {
    id: "micro-drama",
    label: "Micro Drama",
    image:
      "https://images.pexels.com/photos/35171242/pexels-photo-35171242.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    icon: Film,
  },
  {
    id: "trailer",
    label: "Trailer",
    image:
      "https://images.pexels.com/photos/7170704/pexels-photo-7170704.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    icon: Sparkles,
  },
  {
    id: "travel",
    label: "Travel Vlog",
    image:
      "https://images.pexels.com/photos/16299830/pexels-photo-16299830.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    icon: Globe,
  },
];

/* ------------------------------------------------------------------ */
/*  What's New                                                         */
/* ------------------------------------------------------------------ */

export type NewsItem = {
  id: string;
  title: string;
  image: string;
  badge: "Upgrade Now" | "Try Now";
  tint?: string;
};

export const whatsNewItems: NewsItem[] = [
  {
    id: "gpt-image",
    title: "30% Off GPT Image 2.6 Until Nov 17.",
    image:
      "https://images.pexels.com/photos/36364968/pexels-photo-36364968.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    badge: "Upgrade Now",
  },
  {
    id: "seedream",
    title: "50% Off Seedream 5.5 Until Nov 23.",
    image:
      "https://images.pexels.com/photos/6404185/pexels-photo-6404185.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    badge: "Upgrade Now",
  },
  {
    id: "kling",
    title: "50% Off Kling 4 Until Nov 20.",
    image:
      "https://images.pexels.com/photos/14605645/pexels-photo-14605645.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    badge: "Upgrade Now",
  },
  {
    id: "recraft",
    title: "30% Off All Recraft V4.1 models until Nov 22",
    image:
      "https://images.pexels.com/photos/18386912/pexels-photo-18386912.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
    badge: "Upgrade Now",
  },
  {
    id: "launch-video",
    title: "Create a launch video for your product",
    image:
      "https://images.pexels.com/photos/1350461/pexels-photo-1350461.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    badge: "Try Now",
  },
  {
    id: "ip-safety",
    title: "IP Safety Check: Scan for potential copyright issues",
    image:
      "https://images.pexels.com/photos/13143622/pexels-photo-13143622.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    badge: "Try Now",
  },
];

/* ------------------------------------------------------------------ */
/*  Viral Seedance Presets (masonry)                                   */
/* ------------------------------------------------------------------ */

export type PresetItem = {
  id: string;
  title: string;
  image: string;
  /** CSS aspect-ratio value e.g. "4 / 5" */
  aspect: string;
  likes: string;
};

export const presetColumns: PresetItem[][] = [
  [
    {
      id: "neon-drift",
      title: "Neon Drift",
      image:
        "https://images.pexels.com/photos/31419072/pexels-photo-31419072.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      aspect: "4 / 5",
      likes: "12.4k",
    },
    {
      id: "night-ride",
      title: "Night Ride",
      image:
        "https://images.pexels.com/photos/24589327/pexels-photo-24589327.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      aspect: "4 / 3",
      likes: "8.1k",
    },
  ],
  [
    {
      id: "midnight-lobby",
      title: "Midnight Lobby",
      image:
        "https://images.pexels.com/photos/38087236/pexels-photo-38087236.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      aspect: "7 / 6",
      likes: "21.9k",
    },
    {
      id: "shade-reveal",
      title: "Shade Reveal",
      image:
        "https://images.pexels.com/photos/29477188/pexels-photo-29477188.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      aspect: "4 / 5",
      likes: "15.2k",
    },
  ],
  [
    {
      id: "cozy-loop",
      title: "Cozy Loop",
      image:
        "https://images.pexels.com/photos/4913538/pexels-photo-4913538.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      aspect: "3 / 4",
      likes: "9.7k",
    },
    {
      id: "dj-set",
      title: "DJ Set",
      image:
        "https://images.pexels.com/photos/16756716/pexels-photo-16756716.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      aspect: "4 / 3",
      likes: "6.3k",
    },
  ],
  [
    {
      id: "scare-to-selfie",
      title: "Scare to Selfie",
      image:
        "https://images.pexels.com/photos/5371481/pexels-photo-5371481.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
      aspect: "7 / 6",
      likes: "33.5k",
    },
    {
      id: "color-shift",
      title: "Color Shift",
      image:
        "https://images.pexels.com/photos/16677542/pexels-photo-16677542.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      aspect: "4 / 5",
      likes: "11.0k",
    },
  ],
  [
    {
      id: "haunted-hallow",
      title: "Haunted Hallow",
      image:
        "https://images.pexels.com/photos/34963107/pexels-photo-34963107.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
      aspect: "4 / 5",
      likes: "18.8k",
    },
    {
      id: "pumpkin-glow",
      title: "Pumpkin Glow",
      image:
        "https://images.pexels.com/photos/28996070/pexels-photo-28996070.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
      aspect: "4 / 3",
      likes: "7.4k",
    },
  ],
];

/* ------------------------------------------------------------------ */
/*  Popular video models                                               */
/* ------------------------------------------------------------------ */

export type ModelItem = {
  id: string;
  name: string;
  provider: string;
  description: string;
  image: string;
  tag?: "New" | "Hot" | "Fast";
  credits: number;
};

export const popularModels: ModelItem[] = [
  {
    id: "kling",
    name: "Kling 2.5 Turbo",
    provider: "Kuaishou",
    description: "Fast, cinematic motion with strong prompt adherence and smooth camera moves.",
    image:
      "https://images.pexels.com/photos/6153179/pexels-photo-6153179.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    tag: "Hot",
    credits: 20,
  },
  {
    id: "veo",
    name: "Veo 3.1",
    provider: "Google DeepMind",
    description: "Flagship video model with native audio, dialogue and ambient sound.",
    image:
      "https://images.pexels.com/photos/33442715/pexels-photo-33442715.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    tag: "New",
    credits: 60,
  },
  {
    id: "sora",
    name: "Sora 2",
    provider: "OpenAI",
    description: "Physics-aware generation with remarkably consistent characters.",
    image:
      "https://images.pexels.com/photos/7661601/pexels-photo-7661601.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    tag: "New",
    credits: 50,
  },
  {
    id: "seedance",
    name: "Seedance 1.0 Pro",
    provider: "ByteDance",
    description: "Multi-shot storytelling with seamless scene transitions.",
    image:
      "https://images.pexels.com/photos/5371473/pexels-photo-5371473.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    tag: "Hot",
    credits: 30,
  },
  {
    id: "wan",
    name: "Wan 2.5",
    provider: "Alibaba",
    description: "Open-weights model with excellent motion and text rendering.",
    image:
      "https://images.pexels.com/photos/10519044/pexels-photo-10519044.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
    credits: 15,
  },
  {
    id: "hailuo",
    name: "Hailuo 02",
    provider: "MiniMax",
    description: "Crisp 1080p output with expressive, lifelike characters.",
    image:
      "https://images.pexels.com/photos/9363611/pexels-photo-9363611.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
    tag: "Fast",
    credits: 10,
  },
];

/* ------------------------------------------------------------------ */
/*  Trending templates                                                 */
/* ------------------------------------------------------------------ */

export type TemplateItem = {
  id: string;
  title: string;
  author: string;
  uses: string;
  image: string;
};

export const trendingTemplates: TemplateItem[] = [
  {
    id: "cinematic-trailer",
    title: "Cinematic Trailer",
    author: "openart",
    uses: "48k",
    image:
      "https://images.pexels.com/photos/4355348/pexels-photo-4355348.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    id: "logo-reveal",
    title: "Logo Reveal",
    author: "motionlab",
    uses: "32k",
    image:
      "https://images.pexels.com/photos/11508536/pexels-photo-11508536.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    id: "fashion-lookbook",
    title: "Fashion Lookbook",
    author: "studio.k",
    uses: "27k",
    image:
      "https://images.pexels.com/photos/6220701/pexels-photo-6220701.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    id: "deep-dive",
    title: "Deep Dive",
    author: "bluehour",
    uses: "19k",
    image:
      "https://images.pexels.com/photos/13588896/pexels-photo-13588896.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    id: "fog-walk",
    title: "Fog Walk",
    author: "nordic.ai",
    uses: "14k",
    image:
      "https://images.pexels.com/photos/35892092/pexels-photo-35892092.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
  },
  {
    id: "stage-lights",
    title: "Stage Lights",
    author: "redroom",
    uses: "12k",
    image:
      "https://images.pexels.com/photos/6270136/pexels-photo-6270136.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
  {
    id: "moonlit-ghosts",
    title: "Moonlit Ghosts",
    author: "spooky.fx",
    uses: "9k",
    image:
      "https://images.pexels.com/photos/11003194/pexels-photo-11003194.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
  },
  {
    id: "lion-dance",
    title: "Lion Dance",
    author: "catlab",
    uses: "7k",
    image:
      "https://images.pexels.com/photos/30947859/pexels-photo-30947859.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  },
];

/* ------------------------------------------------------------------ */
/*  Prompt suggestions                                                 */
/* ------------------------------------------------------------------ */

export const placeholderPrompts = [
  "Upbeat background music video for a sneaker launch",
  "A cinematic trailer for a sci-fi short film set on Mars",
  "15-second UGC ad for a skincare brand, handheld, natural light",
  "Neon-lit music video, slow dolly through a rainy Tokyo street",
  "Real estate walkthrough of a modern glass house at golden hour",
];
