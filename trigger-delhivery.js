import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://fuhpzltwbiblcxeixtsz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHB6bHR3YmlibGN4ZWl4dHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzA4ODAsImV4cCI6MjA3NTE0Njg4MH0.-azMtemB-mtIWaZpZd3dmsdOPvGAk7yDTKS95Ju33xk";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createDelhiveryOrder() {
  const orderId = "4aea082f-fc52-40e8-9b4c-46af198c16b9";

  console.log(`\nProcessing Order: ${orderId}`);

  // 1. Attempt to reset the order state specifically for this retry
  // The 'delhivery-create' function will abort if 'shipment_created_at' is present.
  console.log("Step 1: Attempting to reset 'shipment_created_at' in database...");
  
  const { error: updateError } = await supabase
    .from('orders')
    .update({ 
      shipment_created_at: null,
      delhivery_response: null,
      shipment_status: 'Pending Retry' 
    })
    .eq('id', orderId);

  if (updateError) {
    console.warn("⚠️  Warning: Could not reset order state via script.");
    console.warn(`   Reason: ${updateError.message}`);
    console.warn("   NOTE: If the API call below returns 'Shipment already exists', you MUST manually clear the 'shipment_created_at' column for this order in your Supabase Dashboard.");
  } else {
    console.log("✅ Success: Order state reset. 'shipment_created_at' is now null.");
  }

  // 2. Call the Edge Function
  console.log("\nStep 2: Triggering 'delhivery-create' function...");

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/delhivery-create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({ orderId })
    });

    const data = await response.json();
    console.log(`Response Status: ${response.status}`);
    
    if (data.ok) {
        console.log("✅ SUCCESS: Shipment created!");
        console.log("AWB:", data.awb);
        console.log("Full Response:", JSON.stringify(data, null, 2));
    } else {
        console.error("❌ FAILED:", data.message || data.error);
        if (data.message === "Shipment already exists") {
             console.log("\n>>> ACTION REQUIRED: The database thinks this shipment exists. Please go to your Supabase Dashboard > Table Editor > 'orders' table, find this order, and manually clear the 'shipment_created_at' and 'delhivery_response' cells. Then run this script again.");
        } else {
             console.log("Details:", JSON.stringify(data, null, 2));
        }
    }

  } catch (error) {
    console.error("Error calling API:", error);
  }
}

createDelhiveryOrder();
