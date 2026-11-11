"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Registered once; only imported by home-page scenes so GSAP stays out of the other pages' bundles.
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
