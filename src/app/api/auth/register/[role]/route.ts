import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-server";
import { 
  clientRegisterSchema, 
  courierRegisterSchema,
  merchantRegisterSchema,
  providerRegisterSchema
} from "@/lib/validations/auth";
import { UserRole } from "@/lib/auth-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: { role: string } }
) {
  try {
    const role = params.role.toUpperCase() as UserRole;
    const body = await req.json();
    
    // Sélectionner le schéma approprié selon le rôle
    let validatedData;
    switch (role) {
      case UserRole.CLIENT:
        validatedData = clientRegisterSchema.parse(body);
        break;
      case UserRole.COURIER:
        validatedData = courierRegisterSchema.parse(body);
        break;
      case UserRole.MERCHANT:
        validatedData = merchantRegisterSchema.parse(body);
        break;
      case UserRole.PROVIDER:
        validatedData = providerRegisterSchema.parse(body);
        break;
      default:
        return NextResponse.json(
          { message: "Type d'utilisateur non valide" },
          { status: 400 }
        );
    }
    
    // Vérifier si l'email existe déjà
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { message: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }
    
    // Hacher le mot de passe
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Créer l'utilisateur
    const user = await db.user.create({
      data: {
        name: `${validatedData.firstName} ${validatedData.lastName}`,
        email: validatedData.email,
        password: hashedPassword,
        role: role,
        phone: validatedData.phone || null,
        // Traiter les données spécifiques au rôle dans le profil
        profile: {
          create: {
            ...validatedData,
            // Retirer les champs redondants
            password: undefined,
            confirmPassword: undefined,
            termsAccepted: undefined,
          }
        }
      }
    });
    
    return NextResponse.json(
      { 
        message: "Inscription réussie",
        userId: user.id 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Erreur d'inscription:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json(
        { message: "Données non valides", errors: error.format() },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { message: "Erreur lors de l'inscription" },
      { status: 500 }
    );
  }
}
