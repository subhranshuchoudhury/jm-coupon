"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

interface CouponCodeDisplayProps {
    code: string;
    globalVisible?: boolean;
}

export default function CouponCodeDisplay({ code, globalVisible = false }: CouponCodeDisplayProps) {
    const [isVisible, setIsVisible] = useState(globalVisible);

    const getMaskedCode = (code: string) => {
        if (!code) return "";
        if (code.length <= 6) return "XXXXXX"; // Fallback for short codes
        const first3 = code.substring(0, 3);
        const last3 = code.substring(code.length - 3);
        return `${first3}XXXX${last3}`;
    };

    useEffect(() => {
        setIsVisible(globalVisible);
    }, [globalVisible]);

    return (
        <div className="flex items-center gap-2">
            <span className="font-mono badge badge-neutral p-3 font-semibold">
                {isVisible ? code : getMaskedCode(code)}
            </span>
            <button
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => setIsVisible(!isVisible)}
                title={isVisible ? "Hide Code" : "Show Code"}
            >
                {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
        </div>
    );
}
