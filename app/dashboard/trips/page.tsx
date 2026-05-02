import type { Metadata } from "next";
import { TripManager } from "@/components/trips/trip-manager";

export const metadata: Metadata = {
  title: "Trips",
};

export default function TripsPage() {
  return <TripManager />;
}
