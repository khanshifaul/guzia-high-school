"use client";

import * as React from "react";
import Image from "next/image";
import { FaPlus, FaTrash, FaGripVertical, FaEye, FaEyeSlash, FaFloppyDisk } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { getAdminHeroSlides, createHeroSlide, updateHeroSlide, deleteHeroSlide, reorderHeroSlides, type HeroSlide } from "@/lib/hero-slides";

export default function AdminHeroSlidesPage() {
  
  const [slides, setSlides] = React.useState<HeroSlide[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    titleEn: "",
    titleBn: "",
    subtitleEn: "",
    subtitleBn: "",
    imageUrl: "",
    ctaTextEn: "",
    ctaTextBn: "",
    ctaLink: "/admission",
    published: true,
    sortOrder: 0,
  });

  const load = React.useCallback(async () => {
    try {
      const data = await getAdminHeroSlides();
      setSlides(data);
    } catch (e: any) {
      console.error(e.message || "Failed to load slides");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.titleEn || !form.subtitleEn || !form.imageUrl) {
      alert("Title (EN), subtitle (EN), and image URL are required");
      return;
    }
    setSaving(true);
    try {
      await createHeroSlide({ ...form, sortOrder: slides.length });
      alert("Hero slide created");
      setForm({ titleEn: "", titleBn: "", subtitleEn: "", subtitleBn: "", imageUrl: "", ctaTextEn: "", ctaTextBn: "", ctaLink: "/admission", published: true, sortOrder: 0 });
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (slide: HeroSlide) => {
    try {
      await updateHeroSlide(slide.id, { published: !slide.published });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    try {
      await deleteHeroSlide(id);
      await load();
      alert("Deleted");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const move = async (idx: number, dir: number) => {
    const arr = [...slides];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    const items = arr.map((s, i) => ({ id: s.id, sortOrder: i }));
    setSlides(arr);
    try {
      await reorderHeroSlides(items);
    } catch (e: any) {
      alert(e.message);
      await load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hero Slider</h1>
          <p className="text-muted-foreground">Manage homepage hero slides. Controlled entirely by admin.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FaPlus className="h-5 w-5" /> Add New Slide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Title (English) *</Label>
              <Input value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} placeholder="Shaping Tomorrow Leaders" />
            </div>
            <div className="space-y-2">
              <Label>Title (Bangla)</Label>
              <Input value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} placeholder="আগামী দিনের নেতৃত্ব তৈরি" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Subtitle (English) *</Label>
              <Textarea value={form.subtitleEn} onChange={(e) => setForm({ ...form, subtitleEn: e.target.value })} placeholder="A government-recognised secondary school..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Subtitle (Bangla)</Label>
              <Textarea value={form.subtitleBn} onChange={(e) => setForm({ ...form, subtitleBn: e.target.value })} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Image URL *</Label>
              <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="/images/campus.jpg or https://..." />
            </div>
            <div className="space-y-2">
              <Label>CTA Button Text (English)</Label>
              <Input value={form.ctaTextEn} onChange={(e) => setForm({ ...form, ctaTextEn: e.target.value })} placeholder="Apply Now" />
            </div>
            <div className="space-y-2">
              <Label>CTA Button Text (Bangla)</Label>
              <Input value={form.ctaTextBn} onChange={(e) => setForm({ ...form, ctaTextBn: e.target.value })} placeholder="ভর্তি আবেদন" />
            </div>
            <div className="space-y-2">
              <Label>CTA Link</Label>
              <Input value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} placeholder="/admission" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <Label>Published</Label>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving}><FaFloppyDisk className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Create Slide"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slides ({slides.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="text-muted-foreground">Loading...</p> : slides.length === 0 ? <p className="text-muted-foreground">No slides yet. Create one above.</p> : slides.map((slide, idx) => (
            <div key={slide.id} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(idx, -1)} disabled={idx === 0}><FaGripVertical className="h-4 w-4 rotate-90" /></Button>
                <Button variant="ghost" size="icon" onClick={() => move(idx, 1)} disabled={idx === slides.length - 1}><FaGripVertical className="h-4 w-4 -rotate-90" /></Button>
              </div>
              <div className="relative h-16 w-28 rounded overflow-hidden flex-shrink-0">
                <Image src={slide.imageUrl} alt={slide.titleEn} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{slide.titleEn}</p>
                <p className="text-sm text-muted-foreground truncate">{slide.subtitleEn}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => togglePublish(slide)}>
                  {slide.published ? <FaEye className="h-4 w-4" /> : <FaEyeSlash className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(slide.id)}>
                  <FaTrash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
