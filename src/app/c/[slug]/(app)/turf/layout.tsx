import { CollegeOnly } from "@/features/college";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <CollegeOnly>{children}</CollegeOnly>;
}
