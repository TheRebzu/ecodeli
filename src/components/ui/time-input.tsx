"use client";

import { useState } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Icons } from "@/components/shared/icons";

interface TimeInputProps {
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function TimeInput({
  defaultValue = "",
  onChange,
  className,
  ...props
}: TimeInputProps & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'defaultValue'>) {
  const [time, setTime] = useState(defaultValue || "");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTime(value);
    onChange?.(value);
  };

  const incrementHour = () => {
    if (!time) {
      setTime("01:00");
      onChange?.("01:00");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const newHours = hours >= 23 ? 0 : hours + 1;
    const formattedHours = newHours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const newTime = `${formattedHours}:${formattedMinutes}`;
    
    setTime(newTime);
    onChange?.(newTime);
  };

  const decrementHour = () => {
    if (!time) {
      setTime("23:00");
      onChange?.("23:00");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const newHours = hours <= 0 ? 23 : hours - 1;
    const formattedHours = newHours.toString().padStart(2, "0");
    const formattedMinutes = minutes.toString().padStart(2, "0");
    const newTime = `${formattedHours}:${formattedMinutes}`;
    
    setTime(newTime);
    onChange?.(newTime);
  };

  const incrementMinute = () => {
    if (!time) {
      setTime("00:15");
      onChange?.("00:15");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    let newHours = hours;
    let newMinutes = minutes + 15;
    
    if (newMinutes >= 60) {
      newMinutes = newMinutes - 60;
      newHours = newHours >= 23 ? 0 : newHours + 1;
    }
    
    const formattedHours = newHours.toString().padStart(2, "0");
    const formattedMinutes = newMinutes.toString().padStart(2, "0");
    const newTime = `${formattedHours}:${formattedMinutes}`;
    
    setTime(newTime);
    onChange?.(newTime);
  };

  const decrementMinute = () => {
    if (!time) {
      setTime("00:45");
      onChange?.("00:45");
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    let newHours = hours;
    let newMinutes = minutes - 15;
    
    if (newMinutes < 0) {
      newMinutes = newMinutes + 60;
      newHours = newHours <= 0 ? 23 : newHours - 1;
    }
    
    const formattedHours = newHours.toString().padStart(2, "0");
    const formattedMinutes = newMinutes.toString().padStart(2, "0");
    const newTime = `${formattedHours}:${formattedMinutes}`;
    
    setTime(newTime);
    onChange?.(newTime);
  };

  return (
    <div className="relative flex items-center">
      <Input
        type="time"
        value={time}
        onChange={handleChange}
        className="pr-16"
        {...props}
      />
      <div className="absolute right-1 flex space-x-1">
        <div className="flex flex-col">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={incrementHour}
          >
            <Icons.chevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={decrementHour}
          >
            <Icons.chevronDown className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex flex-col">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={incrementMinute}
          >
            <Icons.chevronUp className="h-3 w-3" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0"
            onClick={decrementMinute}
          >
            <Icons.chevronDown className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
} 