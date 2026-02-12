import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Navbar from "@/components/landing/Navbar";
import Plans from "@/components/landing/Plans";
import GainSimulator from "@/components/landing/GainSimulator";
import ReferralSection from "@/components/landing/ReferralSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <main className="flex flex-col">
        <Hero />
        <HowItWorks />
        <ReferralSection />
        <GainSimulator />
        <Plans />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
