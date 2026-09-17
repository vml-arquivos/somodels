import { useParams } from "wouter";
import { DiscoveryPage } from "./Home";

export default function CityPage() {
  const { city = "" } = useParams<{ city: string }>();
  let decoded = city;
  try {
    decoded = decodeURIComponent(city);
  } catch {
    decoded = city;
  }
  const normalized = decoded.trim().slice(0, 120);
  return <DiscoveryPage fixedCity={normalized} />;
}
