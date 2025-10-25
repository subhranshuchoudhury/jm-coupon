import { LucideProps } from "lucide-react";

export type Reward = {
    id: string;
    title: string;
    points: number;
    icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>>;

}

export type Transaction = {
    id: string;
    type: string;
    title: string;
    points: number;
    date: string;
}

export type RedeemRequest = {
    id: string | number;
    title: string;
    points: number;
    date: string;
    status: 'approved' | 'rejected' | 'pending';
    message?: string;
};