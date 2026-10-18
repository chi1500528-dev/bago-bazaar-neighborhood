// Fallback category photography, keyed by category slug. Replace a file to swap a photo.
import food from "@/assets/cat-food.jpg";
import groceries from "@/assets/cat-groceries.jpg";
import fashion from "@/assets/cat-fashion.jpg";
import beauty from "@/assets/cat-beauty.jpg";
import electronics from "@/assets/cat-electronics.jpg";
import phones from "@/assets/cat-phones.jpg";
import home from "@/assets/cat-home.jpg";
import kitchen from "@/assets/cat-kitchen.jpg";
import health from "@/assets/cat-health.jpg";
import baby from "@/assets/cat-baby.jpg";
import stationery from "@/assets/cat-stationery.jpg";
import other from "@/assets/cat-other.jpg";

const MAP: Record<string, string> = {
  food, groceries, fashion, beauty, electronics, phones, home, kitchen, health, baby, stationery, other,
};

export function categoryImage(slug: string | null | undefined): string | null {
  return (slug && MAP[slug]) || null;
}
