'use client';

interface PlanCardProps {
  title: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

export default function SubscriptionPlanCard({ title, price, features, isPopular }: PlanCardProps) {
  return (
    <div className='border rounded-lg p-6'>
      <h3 className='text-lg font-bold'>{title}</h3>
      <p>Composant en développement</p>
    </div>
  );
}