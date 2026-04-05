import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb } from "lucide-react";

interface OnboardingTooltipProps {
  id: string;
  title: string;
  description: string;
  position?: "top" | "bottom";
  children: React.ReactNode;
}

const OnboardingTooltip = ({ id, title, description, position = "bottom", children }: OnboardingTooltipProps) => {
  const storageKey = `onboarding-dismissed-${id}`;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(storageKey, "true");
  };

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: position === "bottom" ? -8 : 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute z-50 w-72 ${
              position === "bottom" ? "top-full mt-2" : "bottom-full mb-2"
            } left-1/2 -translate-x-1/2`}
          >
            <div className="bg-primary text-primary-foreground rounded-xl p-4 shadow-lg relative">
              <div className="absolute w-3 h-3 bg-primary rotate-45 left-1/2 -translate-x-1/2 ${position === 'bottom' ? '-top-1.5' : '-bottom-1.5'}" />
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-sm mb-1">{title}</h4>
                  <p className="text-xs opacity-90 leading-relaxed">{description}</p>
                </div>
                <button
                  onClick={dismiss}
                  className="p-1 hover:bg-primary-foreground/20 rounded-lg transition-colors flex-shrink-0"
                  aria-label="ปิดคำแนะนำ"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OnboardingTooltip;
