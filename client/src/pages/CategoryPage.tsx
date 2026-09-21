import { useParams } from "wouter";
import { DiscoveryPage } from "./Home";

export default function CategoryPage() {
  const { category = "" } = useParams<{ category: string }>();
  let decoded = category;
  try {
    decoded = decodeURIComponent(category);
  } catch {
    decoded = category;
  }
  return <DiscoveryPage fixedCategory={decoded.trim().slice(0, 60)} />;
}
