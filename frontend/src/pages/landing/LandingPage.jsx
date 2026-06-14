import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LandingNav from './components/LandingNav';
import Hero from './components/Hero';
import PainPoints from './components/PainPoints';
import Features from './components/Features';
import ProductShowcase from './components/ProductShowcase';
import HowItWorks from './components/HowItWorks';
import Pricing from './components/Pricing';
import ContactForm from './components/ContactForm';
import LandingFooter from './components/LandingFooter';

const LandingPage = () => {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'FeeDesk — Every payment. Accounted for.';
  }, []);

  if (user) {
    const target = user.role === 'super_admin' ? '/admin/dashboard' : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return (
    <div className="min-h-screen bg-paper font-display text-ink antialiased">
      <LandingNav />
      <main>
        <Hero />
        <PainPoints />
        <Features />
        <ProductShowcase />
        <HowItWorks />
        <Pricing />
        <ContactForm />
      </main>
      <LandingFooter />
    </div>
  );
};

export default LandingPage;
