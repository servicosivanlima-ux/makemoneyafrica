import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import BusinessPromotion from "@/components/landing/BusinessPromotion";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import Navbar from "@/components/landing/Navbar";
import Plans from "@/components/landing/Plans";
import GainSimulator from "@/components/landing/GainSimulator";
import ReferralSection from "@/components/landing/ReferralSection";
import SocialProof from "@/components/landing/SocialProof";

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      <SocialProof />
      <main className="flex flex-col">
        <Hero />
        <BusinessPromotion />
        <HowItWorks />
        <Testimonials />
        <ReferralSection />
        <GainSimulator />
        <Plans />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
