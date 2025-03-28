import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema for query parameters
const queryParamsSchema = z.object({
  type: z.enum([
    "customers", 
    "deliveries", 
    "dealer-performance", 
    "financial"
  ]),
  period: z.enum(["day", "week", "month", "quarter", "year"]).default("month"),
  format: z.enum(["csv", "json"]).default("csv"),
});

// GET: Export analytics data
export async function GET(req: NextRequest) {
  try {
    // Authenticate user and verify admin permission
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(req.url);
    const validatedParams = queryParamsSchema.safeParse({
      type: searchParams.get("type") || "deliveries",
      period: searchParams.get("period") || "month",
      format: searchParams.get("format") || "csv",
    });

    if (!validatedParams.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: validatedParams.error.format() },
        { status: 400 }
      );
    }

    const { type, period, format } = validatedParams.data;
    
    // Construct the URL for the analytics endpoint
    const analyticsUrl = new URL(`${req.nextUrl.origin}/api/analytics/${type}`);
    analyticsUrl.searchParams.set("period", period);
    
    // Add additional parameters based on analytics type
    switch (type) {
      case "deliveries":
        analyticsUrl.searchParams.set("groupBy", "day");
        analyticsUrl.searchParams.set("filter", "all");
        break;
      case "dealer-performance":
        analyticsUrl.searchParams.set("sortBy", "efficiency");
        analyticsUrl.searchParams.set("limit", "50");
        break;
      case "financial":
        analyticsUrl.searchParams.set("groupBy", "day");
        analyticsUrl.searchParams.set("includeDetails", "true");
        break;
      case "customers":
        analyticsUrl.searchParams.set("segment", "all");
        analyticsUrl.searchParams.set("includeDemographics", "true");
        break;
    }

    // Fetch data from the analytics endpoint
    const response = await fetch(analyticsUrl.toString(), {
      headers: {
        Cookie: req.headers.get("cookie") || "",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch ${type} analytics data` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // If format is JSON, return the data as is
    if (format === "json") {
      return NextResponse.json(data);
    }

    // Generate CSV from the analytics data
    const csvData = convertJsonToCsv(data, type);
    
    // Generate filename
    const date = new Date().toISOString().split('T')[0];
    const filename = `ecodeli_${type}_${period}_${date}.csv`;

    // Return CSV data with appropriate headers
    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=${filename}`,
      },
    });
  } catch (error: unknown) {
    console.error("Error exporting analytics data:", error);
    return NextResponse.json(
      { error: "Failed to export analytics data" },
      { status: 500 }
    );
  }
}

// Helper function to convert JSON data to CSV
function convertJsonToCsv(data: Record<string, unknown>, type: string): string {
  let csvContent = "";

  // Add appropriate headers and rows based on data type
  switch (type) {
    case "customers": {
      if (data.summary && typeof data.summary === 'object') {
        // Add metrics summary
        csvContent += "Customer Metrics Summary\n";
        csvContent += "Metric,Value\n";
        
        Object.entries(data.summary as Record<string, unknown>).forEach(([key, value]) => {
          csvContent += `${formatHeaderText(key)},${value}\n`;
        });

        csvContent += "\n";
      }

      // Add loyalty distribution
      if (data.distribution && 
          typeof data.distribution === 'object' && 
          'loyaltyTiers' in data.distribution &&
          typeof data.distribution.loyaltyTiers === 'object') {
        
        csvContent += "Loyalty Tier Distribution\n";
        csvContent += "Tier,Count\n";
        
        Object.entries(data.distribution.loyaltyTiers as Record<string, number>).forEach(([tier, count]) => {
          csvContent += `${tier},${count}\n`;
        });

        csvContent += "\n";
      }

      // Add demographics if available
      if (data.demographics && 
          typeof data.demographics === 'object' && 
          'cities' in data.demographics &&
          Array.isArray(data.demographics.cities)) {
        
        csvContent += "City Distribution\n";
        csvContent += "City,Count,Percentage\n";
        
        (data.demographics.cities as Array<{city: string, count: number, percentage: number}>).forEach(item => {
          csvContent += `${item.city},${item.count},${item.percentage.toFixed(2)}%\n`;
        });

        csvContent += "\n";
      }
      
      break;
    }
    
    case "deliveries": {
      if (data.summary && typeof data.summary === 'object') {
        // Add delivery summary
        csvContent += "Delivery Summary\n";
        csvContent += "Metric,Value\n";
        
        Object.entries(data.summary as Record<string, unknown>).forEach(([key, value]) => {
          if (typeof value === 'number' && key.includes('Rate')) {
            // Format percentages
            csvContent += `${formatHeaderText(key)},${value.toFixed(2)}%\n`;
          } else {
            csvContent += `${formatHeaderText(key)},${value}\n`;
          }
        });

        csvContent += "\n";
      }

      // Add trends data if available
      if (data.trends && Array.isArray(data.trends) && data.trends.length > 0) {
        csvContent += "Delivery Trends\n";
        
        // Get headers from first item
        const firstItem = data.trends[0] as Record<string, unknown>;
        const headers = Object.keys(firstItem);
        csvContent += headers.map(formatHeaderText).join(",") + "\n";
        
        // Add data rows
        data.trends.forEach(item => {
          const row = headers.map(header => (item as Record<string, unknown>)[header]).join(",");
          csvContent += row + "\n";
        });
      }
      
      break;
    }
    
    case "dealer-performance": {
      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        csvContent += "Delivery Personnel Performance\n";
        
        // Get headers from first item, including nested metrics
        const firstItem = data.data[0] as Record<string, unknown>;
        const headers = Object.keys(firstItem).filter(key => key !== 'metrics');
        
        // Get metric keys if they exist
        const metricHeaders: string[] = [];
        if (firstItem.metrics && typeof firstItem.metrics === 'object') {
          const metricKeys = Object.keys(firstItem.metrics as Record<string, unknown>);
          metricKeys.forEach(key => metricHeaders.push(`metrics.${key}`));
        }
        
        // Combine base headers with metric headers
        const allHeaders = [...headers, ...metricHeaders];
        
        csvContent += allHeaders.map(formatHeaderText).join(",") + "\n";
        
        // Add data rows
        data.data.forEach(dealerItem => {
          const dealer = dealerItem as Record<string, unknown>;
          const rowValues = allHeaders.map(header => {
            if (header.startsWith('metrics.')) {
              const metricKey = header.replace('metrics.', '');
              return (dealer.metrics as Record<string, unknown>)[metricKey];
            } else {
              return dealer[header];
            }
          });
          
          csvContent += rowValues.join(",") + "\n";
        });
      }
      
      break;
    }
    
    case "financial": {
      if (data.summary && typeof data.summary === 'object') {
        // Add financial summary
        csvContent += "Financial Summary\n";
        csvContent += "Metric,Value\n";
        
        Object.entries(data.summary as Record<string, unknown>).forEach(([key, value]) => {
          if (key === 'profitMargin' && typeof value === 'number') {
            csvContent += `${formatHeaderText(key)},${value.toFixed(2)}%\n`;
          } else {
            csvContent += `${formatHeaderText(key)},${value}\n`;
          }
        });

        csvContent += "\n";
      }

      // Add trends data
      if (data.trends && Array.isArray(data.trends) && data.trends.length > 0) {
        csvContent += "Financial Trends\n";
        
        // Get headers from first item
        const firstItem = data.trends[0] as Record<string, unknown>;
        const headers = Object.keys(firstItem);
        csvContent += headers.map(formatHeaderText).join(",") + "\n";
        
        // Add data rows
        data.trends.forEach(item => {
          const row = headers.map(header => (item as Record<string, unknown>)[header]).join(",");
          csvContent += row + "\n";
        });

        csvContent += "\n";
      }
      
      // Add revenue breakdown if available
      if (data.details && 
          typeof data.details === 'object' && 
          'revenue' in data.details &&
          typeof data.details.revenue === 'object' &&
          'bySource' in data.details.revenue) {
        
        csvContent += "Revenue by Source\n";
        csvContent += "Source,Amount\n";
        
        Object.entries((data.details.revenue as Record<string, unknown>).bySource as Record<string, number>).forEach(([source, amount]) => {
          csvContent += `${formatHeaderText(source)},${amount}\n`;
        });

        csvContent += "\n";
      }
      
      break;
    }
    
    default: {
      // Generic CSV conversion for unknown data types
      // Get first level keys
      csvContent += "EcoDeli Analytics Export\n\n";
      
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // For object values, create a section with key-value pairs
          csvContent += `${formatHeaderText(key)}\n`;
          csvContent += "Property,Value\n";
          
          Object.entries(value as Record<string, unknown>).forEach(([subKey, subValue]) => {
            csvContent += `${formatHeaderText(subKey)},${formatCsvValue(subValue)}\n`;
          });
          
          csvContent += "\n";
        } else if (Array.isArray(value) && value.length > 0) {
          // For array values, create a table with headers from the first item
          csvContent += `${formatHeaderText(key)}\n`;
          
          const firstItem = value[0] as Record<string, unknown>;
          const headers = Object.keys(firstItem);
          csvContent += headers.map(formatHeaderText).join(",") + "\n";
          
          value.forEach(item => {
            const row = headers.map(header => formatCsvValue((item as Record<string, unknown>)[header])).join(",");
            csvContent += row + "\n";
          });
          
          csvContent += "\n";
        } else {
          // For simple values, just add as key-value
          csvContent += `${formatHeaderText(key)},${formatCsvValue(value)}\n`;
        }
      });
    }
  }

  return csvContent;
}

// Helper function to format header text
function formatHeaderText(text: string): string {
  return text
    .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase words
    .trim();
}

// Helper function to format CSV values
function formatCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    // Escape quotes and wrap in quotes if it contains commas or quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  if (typeof value === 'object') {
    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  }
  
  return String(value);
} 