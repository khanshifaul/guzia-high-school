"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { FaArrowRight, FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { getHeroSlides, type HeroSlide } from "@/lib/hero-slides";
import { nextEvent } from "@/lib/public-content";
import { FaCalendarCheck } from "react-icons/fa";

export function HeroSlider() {
  const { language } = useLanguage();
  const [slides, setSlides] = React.useState<HeroSlide[]>([]);
  const [index, setIndex] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    getHeroSlides()
      .then((data) => {
        setSlides(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  React.useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const go = (dir: number) => {
    if (slides.length === 0) return;
    setIndex((i) => (i + dir + slides.length) % slides.length);
  };

  if (!loaded || slides.length === 0) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 py-24 md:py-36">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              Guzia Bilateral High School · Est. 1958 · Bogura
            </div>
            <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-black tracking-tight text-foreground leading-none mb-4">
              Shaping Tomorrow <span className="text-primary">Leaders</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
              A government-recognised secondary school for Classes 6–10, where students
              excel academically, build character, and prepare for a bright future.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider shadow-md shadow-primary/20">
                  Enter Portal <FaArrowRight size={14} />
                </Button>
              </Link>
              <Link href="/news">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider">
                  News &amp; Events
                </Button>
              </Link>
            </div>
            <div className="mt-6 flex justify-center">
              <Link
                href="/news"
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <FaCalendarCheck className="size-3 text-primary" />
                Next: <span className="text-foreground">{nextEvent().title}</span>
                <span>· {new Date(nextEvent().date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    );
  }

  const slide = slides[index];
  const title = language === "bn" && slide.titleBn ? slide.titleBn : slide.titleEn;
  const subtitle = language === "bn" && slide.subtitleBn ? slide.subtitleBn : slide.subtitleEn;
  const ctaText = language === "bn" && slide.ctaTextBn ? slide.ctaTextBn : slide.ctaTextEn;
  const ctaLink = slide.ctaLink || "/admission";

  return (
    <section className="relative overflow-hidden min-h-[70vh] md:min-h-[80vh] flex items-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <Image
            src={slide.imageUrl}
            alt={title}
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/70 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id + "-content"}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-6 backdrop-blur-sm">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              Guzia Bilateral High School · Est. 1958 · Bogura
            </div>
            <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-black tracking-tight text-foreground leading-[0.95] mb-6">
              {title.split(" ").map((word, i) =>
                word.toLowerCase().includes("leader") || word.toLowerCase().includes("leader") ? (
                  <span key={i} className="text-primary">{word} </span>
                ) : (
                  <span key={i}>{word} </span>
                ),
              )}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
              {subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {ctaText ? (
                <Link href={ctaLink}>
                  <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider shadow-lg shadow-primary/25">
                    {ctaText} <FaArrowRight size={14} />
                  </Button>
                </Link>
              ) : null}
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base px-8 font-black uppercase tracking-wider backdrop-blur-sm bg-background/50">
                  Enter Portal <FaArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {slides.length > 1 ? (
        <>
          <button
            onClick={() => go(-1)}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-10 size-12 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center hover:bg-background hover:border-primary/40 transition-all shadow-lg"
            aria-label="Previous slide"
          >
            <FaChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => go(1)}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-10 size-12 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 flex items-center justify-center hover:bg-background hover:border-primary/40 transition-all shadow-lg"
            aria-label="Next slide"
          >
            <FaChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-primary" : "w-1.5 bg-foreground/30 hover:bg-foreground/50"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
