"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const DialogContext = React.createContext<{
    open: boolean
    onOpenChange: (open: boolean) => void
}>({ open: false, onOpenChange: () => { } })

export const Dialog = ({ children, open, onOpenChange }: { children: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) => {
    const [internalOpen, setInternalOpen] = React.useState(false) // Fallback if uncontrolled (not used here)
    const isControlled = open !== undefined
    const actualOpen = isControlled ? open : internalOpen

    // Safety check: ensure onOpenChange is provided if controlled, else provide fallback
    const actualOnOpenChange = isControlled && onOpenChange ? onOpenChange : setInternalOpen

    return (
        <DialogContext.Provider value={{ open: !!actualOpen, onOpenChange: actualOnOpenChange }}>
            {children}
        </DialogContext.Provider>
    )
}

export const DialogContent = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    const { open, onOpenChange } = React.useContext(DialogContext)

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onOpenChange(false)}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                        transition={{ duration: 0.2 }}
                    />

                    {/* Dialog Container (Centering) */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        {/* Dialog Panel */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{ duration: 0.2, type: "spring", bounce: 0, stiffness: 300, damping: 25 }}
                            className={cn(
                                "bg-background rounded-lg shadow-lg w-full max-w-lg overflow-hidden pointer-events-auto border bg-white",
                                className
                            )}
                        >
                            <div className="relative p-6">
                                <button
                                    onClick={() => onOpenChange(false)}
                                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Close</span>
                                </button>
                                {children}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col space-y-1.5 text-center sm:text-left",
            className
        )}
        {...props}
    />
)

export const DialogTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight text-slate-900",
            className
        )}
        {...props}
    />
))
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-slate-500", className)}
        {...props}
    />
))
DialogDescription.displayName = "DialogDescription"

export const DialogFooter = ({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
            className
        )}
        {...props}
    />
)
DialogFooter.displayName = "DialogFooter"
