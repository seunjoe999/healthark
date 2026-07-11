import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import SocialSidebar from './components/SocialSidebar'
import Home from './pages/Home'
import About from './pages/About'
import Services from './pages/Services'
import Specialism from './pages/Specialism'
import HowWeWork from './pages/HowWeWork'
import Carers from './pages/Carers'
import MakeAReferral from './pages/MakeAReferral'
import Jobs from './pages/Jobs'
import Feedback from './pages/Feedback'
import Contact from './pages/Contact'
import DayServices from './pages/DayServices'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <SocialSidebar />
      <main className="pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/our-services" element={<Services />} />
          <Route path="/our-specialism" element={<Specialism />} />
          <Route path="/how-we-work" element={<HowWeWork />} />
          <Route path="/our-carers" element={<Carers />} />
          <Route path="/make-a-referral" element={<MakeAReferral />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/contact-us" element={<Contact />} />
          <Route path="/day-services" element={<DayServices />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
