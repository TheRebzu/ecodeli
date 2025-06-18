// avatar-upload
import React from "react";

export default function AvatarUpload({ 
  currentAvatar, 
  onAvatarChange,
  size = "large" 
}: {
  currentAvatar?: string;
  onAvatarChange?: (file: File | null) => void;
  size?: "small" | "medium" | "large";
}) {
  const [preview, setPreview] = React.useState<string | null>(currentAvatar || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const sizeClasses = {
    small: "w-16 h-16",
    medium: "w-24 h-24", 
    large: "w-32 h-32"
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Le fichier est trop volumineux. Taille maximale : 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      onAvatarChange?.(file);
    }
  };

  const handleRemoveAvatar = () => {
    setPreview(null);
    onAvatarChange?.(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="text-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className={`relative ${sizeClasses[size]} mx-auto`}>
          {preview ? (
            <img
              src={preview}
              alt="Avatar preview"
              className={`${sizeClasses[size]} rounded-full object-cover border-4 border-gray-200`}
            />
          ) : (
            <div className={`${sizeClasses[size]} rounded-full bg-gray-100 border-4 border-gray-200 flex items-center justify-center`}>
              <svg 
                className="w-8 h-8 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            {preview ? "Changer l'avatar" : "Télécharger un avatar"}
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <p className="text-xs text-gray-500">
            JPG, PNG ou GIF. Taille max: 5MB
          </p>
        </div>
      </div>
    </div>
  );
}
