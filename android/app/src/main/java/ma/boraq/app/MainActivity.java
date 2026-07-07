package ma.boraq.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Window window = getWindow();
        
        // 1. Force the layout to go 100% fullscreen edge-to-edge past all screen limits
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            window.setFlags(
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
            );
        }
        
        // 2. Set WebView background color to match dark theme to prevent white startup flashes
        try {
            this.bridge.getWebView().setBackgroundColor(Color.parseColor("#0f1729"));
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
