"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function TestCss() {
  const [count, setCount] = useState(0);
  
  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">Test CSS Component</h2>
      <p className="text-gray-700 mb-2">Current count: {count}</p>
      <Button 
        onClick={() => setCount(count + 1)}
        className="bg-blue-500 hover:bg-blue-700 text-white"
      >
        Increment
      </Button>
    </div>
  );
} 