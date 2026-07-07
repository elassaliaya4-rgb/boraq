package ma.boraq.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Window window = getWindow();
        
        // 1. Force layout to extend edge-to-edge behind status and navigation bars using official system UI flags
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.clearFlags(
                WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS |
                WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION
            );
            window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
        }
        
        // 2. Disable default Android contrast scrim overlays
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        // 3. Force white status bar and navigation bar icons natively for dark backgrounds
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                // Clear APPEARANCE_LIGHT_STATUS_BARS to make status bar icons white/light
                controller.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
                // Clear APPEARANCE_LIGHT_NAVIGATION_BARS to make navigation bar icons white/light
                controller.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            int flags = window.getDecorView().getSystemUiVisibility();
            flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            window.getDecorView().setSystemUiVisibility(flags);
        }
        
        // 4. Set WebView background color to match dark theme to prevent white startup flashes
        try {
            this.bridge.getWebView().setBackgroundColor(Color.parseColor("#0f1729"));
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 5. Register native printing bridge interface to handle window.print() inside webview
        try {
            this.bridge.getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public void print() {
                    MainActivity.this.runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                                android.print.PrintManager printManager = (android.print.PrintManager) MainActivity.this.getSystemService(android.content.Context.PRINT_SERVICE);
                                android.print.PrintDocumentAdapter printAdapter = MainActivity.this.bridge.getWebView().createPrintDocumentAdapter("Boraq Ticket");
                                String jobName = "Boraq Cargo Ticket";
                                if (printManager != null) {
                                    printManager.print(jobName, printAdapter, new android.print.PrintAttributes.Builder().build());
                                }
                            }
                        }
                    });
                }
            }, "AndroidPrint");
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
