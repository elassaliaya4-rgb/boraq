package ma.boraq.app;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Force the app to draw edge-to-edge behind status and navigation bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
