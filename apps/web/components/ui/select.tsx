"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

interface SelectContextValue {
    value: string
    onValueChange: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
    triggerRef: React.RefObject<HTMLButtonElement | null>
    query: string
    setQuery: (q: string) => void
    searchable: boolean
    disabled: boolean
    label: string
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

interface SelectProps {
    children: React.ReactNode
    value?: string
    onValueChange?: (value: string) => void
    defaultValue?: string
    /** Show a filter box at the top of the dropdown (great for long lists). */
    searchable?: boolean
    /** Disable the trigger (non-interactive). */
    disabled?: boolean
    /** Accessible name for the trigger button. */
    label?: string
}

/** Recursively flatten React children into plain text (for search matching). */
function getNodeText(node: React.ReactNode): string {
    if (node == null || typeof node === "boolean") return ""
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (Array.isArray(node)) return node.map(getNodeText).join("")
    if (React.isValidElement(node)) return getNodeText((node.props as { children?: React.ReactNode }).children)
    return ""
}

/**
 * Custom Select dropdown with keyboard navigation, optional search filter.
 *
 * @example
 * <Select value={value} onValueChange={setValue} searchable>
 *   <SelectTrigger>
 *     <SelectValue placeholder="Select option" />
 *   </SelectTrigger>
 *   <SelectContent>
 *     <SelectItem value="a">Option A</SelectItem>
 *   </SelectContent>
 * </Select>
 */
function Select({ children, value: controlledValue, onValueChange, defaultValue = "", searchable = false, disabled = false, label = "" }: SelectProps) {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const triggerRef = React.useRef<HTMLButtonElement>(null)

    const value = controlledValue !== undefined ? controlledValue : uncontrolledValue
    const setValue = onValueChange || setUncontrolledValue

    // Clear the filter whenever the dropdown closes.
    React.useEffect(() => {
        if (!open) setQuery("")
    }, [open])

    return (
        <SelectContext.Provider
            value={{ value, onValueChange: setValue, open, setOpen, triggerRef, query, setQuery, searchable, disabled, label }}
        >
            <div className="relative">
                {children}
            </div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectTrigger must be used within Select")

    // Combine refs
    const combinedRef = (node: HTMLButtonElement | null) => {
        (context.triggerRef as any).current = node
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
    }

    return (
        <button
            ref={combinedRef}
            type="button"
            role="combobox"
            aria-expanded={context.open}
            aria-haspopup="listbox"
            disabled={context.disabled}
            aria-label={context.label || undefined}
            className={cn(
                "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 cursor-pointer",
                className
            )}
            onClick={() => !context.disabled && context.setOpen(!context.open)}
            {...props}
        >
            {children}
            <svg
                className={cn("h-4 w-4 opacity-50 transition-transform", context.open && "rotate-180")}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
        </button>
    )
})
SelectTrigger.displayName = "SelectTrigger"

interface SelectValueProps {
    placeholder?: string
}

function SelectValue({ placeholder }: SelectValueProps) {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error("SelectValue must be used within Select")

    return (
        <span className={cn(!context.value && "text-muted-foreground")}>
            {context.value || placeholder}
        </span>
    )
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
    sideOffset?: number
    portal?: boolean
    align?: "start" | "center" | "end"
    side?: "top" | "bottom"
    /** Show the filter box (also settable on `Select`). */
    searchable?: boolean
}

const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
    ({ className, children, sideOffset = 4, portal = true, align: _align = "start", side: _side = "bottom", searchable = false, ...props }, ref) => {
        const context = React.useContext(SelectContext)
        if (!context) throw new Error("SelectContent must be used within Select")
        const contentRef = React.useRef<HTMLDivElement>(null)
        const searchRef = React.useRef<HTMLInputElement>(null)
        const [position, setPosition] = React.useState({ top: 0, left: 0 })
        const [mounted, setMounted] = React.useState(false)
        const showSearch = searchable || context.searchable

        React.useEffect(() => {
            setMounted(true)
        }, [])

        React.useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (context.open) {
                    const target = e.target as Node
                    const content = contentRef.current
                    const trigger = context.triggerRef.current

                    if (content?.contains(target) || (trigger && trigger.contains(target))) {
                        return
                    }
                    context.setOpen(false)
                }
            }

            const handleEscape = (e: KeyboardEvent) => {
                if (e.key === "Escape" && context.open) {
                    context.setOpen(false)
                }
            }

            const checkPosition = () => {
                if (context.open && contentRef.current && context.triggerRef.current) {
                    const triggerRect = context.triggerRef.current.getBoundingClientRect()
                    const contentRect = contentRef.current.getBoundingClientRect()
                    const viewportHeight = window.innerHeight
                    const viewportWidth = window.innerWidth

                    let top = 0
                    let left = 0

                    // Vertical
                    const spaceBelow = viewportHeight - triggerRect.bottom
                    const spaceAbove = triggerRect.top
                    const neededHeight = contentRect.height + sideOffset
                    const onBottom = spaceBelow >= neededHeight || spaceBelow > spaceAbove

                    if (onBottom) {
                        top = triggerRect.bottom + sideOffset
                    } else {
                        top = triggerRect.top - contentRect.height - sideOffset
                    }

                    // Keep the whole list inside the viewport vertically.
                    if (top < 4) top = 4
                    if (top + contentRect.height > viewportHeight - 4) {
                        top = Math.max(4, viewportHeight - contentRect.height - 4)
                    }

                    // Horizontal
                    left = triggerRect.left

                    // Clamping
                    if (left < 4) left = 4
                    if (left + contentRect.width > viewportWidth - 4) {
                        left = viewportWidth - contentRect.width - 4
                    }

                    setPosition({ top, left })
                }
            }

            if (context.open) {
                requestAnimationFrame(() => {
                    checkPosition()
                    // Focus the filter box for keyboard-first use.
                    if (showSearch) searchRef.current?.focus()
                })
            }

            const timer = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside)
            }, 0)
            document.addEventListener("keydown", handleEscape)
            window.addEventListener("resize", checkPosition)
            window.addEventListener("scroll", checkPosition, true)

            return () => {
                clearTimeout(timer)
                document.removeEventListener("mousedown", handleClickOutside)
                document.removeEventListener("keydown", handleEscape)
                window.removeEventListener("resize", checkPosition)
                window.removeEventListener("scroll", checkPosition, true)
            }
        }, [context.open, context, sideOffset])

        if (!context.open) return null
        if (portal && !mounted) return null

        // Count items that survive the current filter so we can show an
        // empty state ("No matches") instead of a blank list.
        const q = context.query.trim().toLowerCase()
        const visibleCount = React.Children.toArray(children).filter((child) => {
            if (!q || !React.isValidElement(child)) return true
            return getNodeText((child.props as { children?: React.ReactNode }).children).toLowerCase().includes(q)
        }).length

        const content = (
            <div
                ref={(node) => {
                    (contentRef as any).current = node
                    if (typeof ref === 'function') ref(node)
                    else if (ref) ref.current = node
                }}
                role="listbox"
                className={cn(
                    "z-50 min-w-[8rem] flex flex-col overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",
                    "animate-in fade-in-0 zoom-in-95",
                    // Bounded height so long lists scroll instead of overflowing.
                    "max-h-72",
                    !portal && "absolute mt-1",
                    portal && "fixed",
                    className
                )}
                style={{
                    top: portal ? position.top : undefined,
                    left: portal ? position.left : undefined,
                    width: context.triggerRef.current ? context.triggerRef.current.offsetWidth : undefined,
                    ...props.style
                }}
                onClick={(e) => e.stopPropagation()}
                {...props}
            >
                {showSearch ? (
                    <div className="border-b border-border/60 p-1.5">
                        <input
                            ref={searchRef}
                            value={context.query}
                            onChange={(e) => context.setQuery(e.target.value)}
                            placeholder="Search…"
                            aria-label="Search options"
                            className="w-full rounded-sm border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>
                ) : null}

                <div className="overflow-y-auto p-1">
                    {visibleCount === 0 ? (
                        <div className="px-2 py-3 text-center text-xs text-muted-foreground">No matches found</div>
                    ) : (
                        children
                    )}
                </div>
            </div>
        )

        if (portal) {
            return createPortal(content, document.body)
        }

        return content
    }
)
SelectContent.displayName = "SelectContent"

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
    value: string
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
    ({ className, children, value, ...props }, ref) => {
        const context = React.useContext(SelectContext)
        if (!context) throw new Error("SelectItem must be used within Select")

        const isSelected = context.value === value

        // Hide this option when it doesn't match the active search filter.
        const q = context.query.trim().toLowerCase()
        if (q && !getNodeText(children).toLowerCase().includes(q)) return null

        return (
            <div
                ref={ref}
                role="option"
                aria-selected={isSelected}
                className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                    isSelected && "bg-accent text-accent-foreground",
                    className
                )}
                onClick={() => {
                    context.onValueChange(value)
                    context.setOpen(false)
                }}
                {...props}
            >
                {children}
                {isSelected && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </span>
                )}
            </div>
        )
    }
)
SelectItem.displayName = "SelectItem"

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
