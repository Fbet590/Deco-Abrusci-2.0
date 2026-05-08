"use client"

import { useState, useRef, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, ChevronLeft, ChevronRight, Sparkles, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

type Step = {
  title: string
  type: "select" | "text"
  options?: { label: string }[]
  placeholder?: string
  field?: string
}

const CONTACT_STEPS: Step[] = [
  { title: "Your name", type: "text", placeholder: "Full name", field: "name" },
  { title: "Your email address", type: "text", placeholder: "email@example.com", field: "email" },
  { title: "Best number to reach you", type: "text", placeholder: "(555) 123-4567", field: "phone" },
]

function getSteps(): Step[] {
  return CONTACT_STEPS
}

// Validation functions
function isValidEmail(email: string): boolean {
  // Check for basic email structure with proper domain
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) return false
  
  // Block common fake/disposable email patterns
  const fakeDomains = ['test.com', 'fake.com', 'example.com', 'asdf.com', 'qwerty.com', 'abc.com', 'xyz.com', 'aaa.com', 'bbb.com', '123.com']
  const domain = email.split('@')[1]?.toLowerCase()
  if (fakeDomains.includes(domain)) return false
  
  // Block obviously fake local parts
  const localPart = email.split('@')[0]?.toLowerCase()
  const fakePatterns = ['asdf', 'qwerty', 'test', 'fake', 'aaa', 'bbb', 'xxx', '123456', 'abcdef']
  if (fakePatterns.some(pattern => localPart === pattern)) return false
  
  return true
}

function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '')
  
  // Must have 10 digits (US) or 11 digits (with country code)
  if (digitsOnly.length < 10 || digitsOnly.length > 11) return false
  
  // If 11 digits, first digit must be 1 (US country code)
  if (digitsOnly.length === 11 && digitsOnly[0] !== '1') return false
  
  // Get the 10-digit number (strip country code if present)
  const tenDigits = digitsOnly.length === 11 ? digitsOnly.slice(1) : digitsOnly
  
  // Area code (first 3 digits) cannot start with 0 or 1
  if (tenDigits[0] === '0' || tenDigits[0] === '1') return false
  
  // Block obviously fake patterns
  const fakePatterns = ['1234567890', '0000000000', '1111111111', '2222222222', '5555555555', '9999999999', '1231231234', '5551234567']
  if (fakePatterns.includes(tenDigits)) return false
  
  // Block sequential patterns
  if (tenDigits === '0123456789' || tenDigits === '9876543210') return false
  
  // Block repeating digit patterns (e.g., 8888888888)
  if (/^(\d)\1{9}$/.test(tenDigits)) return false
  
  return true
}

function getValidationError(field: string | undefined, value: string): string | null {
  if (!value) return null
  
  if (field === 'email') {
    if (!isValidEmail(value)) {
      return 'Please enter a valid email address'
    }
  }
  
  if (field === 'phone') {
    if (!isValidPhone(value)) {
      return 'Please enter a valid 10-digit phone number'
    }
  }
  
  return null
}

export function QuoteForm({ id }: { id?: string }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [slideDirection, setSlideDirection] = useState<"up" | "down">("up")
  const [validationErrors, setValidationErrors] = useState<Record<number, string | null>>({})
  const [touched, setTouched] = useState<Record<number, boolean>>({})
  const sectionRef = useRef<HTMLElement>(null)

  const steps = useMemo(() => getSteps(), [])

  const step = steps[currentStep]
  const totalSteps = steps.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  const advanceStep = (direction: "up" | "down", nextStep: number) => {
    setSlideDirection(direction)
    setAnimating(true)
    setTimeout(() => {
      setCurrentStep(nextStep)
      setAnimating(false)
    }, 300)
  }

  const handleSelect = (value: string) => {
    if (currentStep === 0 && value !== answers[0]) {
      setAnswers({ 0: value })
    } else {
      setAnswers((prev) => ({ ...prev, [currentStep]: value }))
    }

    if (step.type === "select" && currentStep < totalSteps - 1) {
      setTimeout(() => {
        advanceStep("up", currentStep + 1)
        setTimeout(() => {
          sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        }, 350)
      }, 500)
    }
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      advanceStep("up", currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      advanceStep("down", currentStep - 1)
    }
  }

  const buildPayload = useCallback(() => {
    return {
      name: answers[0] || "",
      email: answers[1] || "",
      phone: answers[2] || "",
    }
  }, [answers])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await fetch("/api/submit-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
    } catch {
      // Still show thank you even if webhook fails
    } finally {
      setSubmitting(false)
      setSubmitted(true)
      if (typeof window !== "undefined" && typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "Lead", {
          content_name: "$7.5K Pergola Package Inquiry",
        })
      }
    }
  }

  const currentValue = answers[currentStep] || ""
  const currentError = getValidationError(step.field, currentValue)
  const canProceed = currentValue !== "" && !currentError

  if (submitted) {
    return (
      <section id={id} className="pt-8 pb-16 bg-primary">
        <div className="mx-auto max-w-lg px-6 text-center animate-fade-in-up">
          <div className="relative border-2 border-[#D09945] bg-card rounded-2xl p-10 sm:p-12 animate-glow-border overflow-hidden">
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-accent/30 rounded-tl-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-accent/30 rounded-tr-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-accent/30 rounded-bl-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-accent/30 rounded-br-2xl pointer-events-none" />
            
            <div className="relative">
              <div className="mx-auto mb-6 flex items-center justify-center gap-2">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-accent" />
                <Sparkles className="h-4 w-4 text-accent" />
                <div className="h-px w-8 bg-gradient-to-l from-transparent to-accent" />
              </div>
              <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center bg-gradient-to-br from-[#D09945] to-[#E8B866] rounded-full shadow-[0_0_30px_rgba(208,153,69,0.4)]">
                <Check className="h-8 w-8 text-black" strokeWidth={3} />
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-card-foreground">Thank You</h2>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {"We've received your inquiry. A member of our team will be in contact shortly to discuss your space."}
              </p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} id={id} className="pt-8 pb-16 bg-primary">
      <div className="mx-auto max-w-lg px-6">
        <div className="mb-8 text-center animate-fade-in-up">
          <div className="mx-auto mb-4 flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-accent" />
            <Sparkles className="h-4 w-4 text-accent" />
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-accent" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-accent">
            Not Every Space Qualifies. Yours Might.
          </p>
          <h2 className="mt-3 font-serif text-4xl font-bold text-primary-foreground sm:text-5xl text-balance">
            See if Your Space Qualifies for Our $7.5K Pergola Package
          </h2>
        </div>

        <div className="relative border-2 border-[#D09945] bg-card rounded-2xl p-6 sm:p-10 animate-glow-border overflow-hidden">
          {/* Decorative corner accents */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-accent/30 rounded-tl-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-accent/30 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-accent/30 rounded-bl-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-accent/30 rounded-br-2xl pointer-events-none" />
          <div className="relative mb-8">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3 uppercase tracking-wider font-medium">
              <span className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent text-[10px] font-bold">
                  {currentStep + 1}
                </span>
                of {totalSteps}
              </span>
              <span className="text-accent font-bold">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-border/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#D09945] to-[#E8B866] rounded-full transition-all duration-700 ease-out animate-progress-glow"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="overflow-hidden">
            <div
              className={cn(
                "transition-all duration-300 ease-out",
                animating
                  ? slideDirection === "up"
                    ? "opacity-0 -translate-y-4"
                    : "opacity-0 translate-y-4"
                  : "opacity-100 translate-y-0"
              )}
            >
              <h3 className="mb-6 text-lg font-semibold text-card-foreground tracking-wide">
                {step.title}
              </h3>

              {step.type === "select" && (
                <div className="flex flex-col gap-2">
                  {step.options?.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => handleSelect(option.label)}
                      className={cn(
                        "flex items-center gap-3 border rounded-lg px-3 py-2.5 text-left text-sm transition-all",
                        answers[currentStep] === option.label
                          ? "border-accent bg-accent/5 text-card-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-accent/40 hover:text-card-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center border rounded transition-all",
                          answers[currentStep] === option.label
                            ? "border-accent bg-accent"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {answers[currentStep] === option.label && (
                          <Check className="h-2 w-2 text-accent-foreground" />
                        )}
                      </div>
                      <span className="tracking-wide">{option.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {step.type === "text" && (
                <div className="space-y-2">
                  <div className="relative group">
                    <Input
                      type={step.field === "email" ? "email" : step.field === "phone" ? "tel" : "text"}
                      placeholder={step.placeholder}
                      value={answers[currentStep] || ""}
                      onChange={(e) => {
                        const value = e.target.value
                        setAnswers((prev) => ({ ...prev, [currentStep]: value }))
                        // Validate on change if field has been touched
                        if (touched[currentStep]) {
                          setValidationErrors((prev) => ({ 
                            ...prev, 
                            [currentStep]: getValidationError(step.field, value) 
                          }))
                        }
                      }}
                      onBlur={() => {
                        setTouched((prev) => ({ ...prev, [currentStep]: true }))
                        setValidationErrors((prev) => ({ 
                          ...prev, 
                          [currentStep]: getValidationError(step.field, answers[currentStep] || "") 
                        }))
                      }}
                      className={cn(
                        "h-14 text-base border-2 bg-card rounded-xl focus:ring-2 tracking-wide transition-all duration-300 pl-4",
                        touched[currentStep] && validationErrors[currentStep]
                          ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                          : touched[currentStep] && answers[currentStep] && !validationErrors[currentStep]
                          ? "border-green-500 focus:border-green-500 focus:ring-green-500/20"
                          : "border-border focus:border-accent focus:ring-accent/20 hover:border-accent/50"
                      )}
                    />
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    {touched[currentStep] && answers[currentStep] && !validationErrors[currentStep] && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Check className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                    {touched[currentStep] && validationErrors[currentStep] && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                  </div>
                  {touched[currentStep] && validationErrors[currentStep] && (
                    <p className="text-sm text-red-500 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {validationErrors[currentStep]}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
              size="lg"
              className="gap-2 rounded-xl border-2 border-border text-muted-foreground hover:border-accent hover:text-card-foreground hover:bg-accent/5 text-xs uppercase tracking-widest transition-all duration-300 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            {currentStep < totalSteps - 1 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                size="lg"
                className="gap-2 bg-gradient-to-r from-[#D09945] to-[#E8B866] text-black font-bold hover:from-[#B8832E] hover:to-[#D09945] rounded-xl text-xs uppercase tracking-widest px-8 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(208,153,69,0.4)] disabled:opacity-50 disabled:hover:scale-100"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed || submitting}
                size="lg"
                className="bg-gradient-to-r from-[#D09945] to-[#E8B866] text-black font-bold hover:from-[#B8832E] hover:to-[#D09945] rounded-xl text-xs uppercase tracking-widest px-8 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(208,153,69,0.4)] animate-pulse-subtle disabled:opacity-50 disabled:animate-none"
              >
                {submitting ? "Submitting..." : "Check My Space"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
