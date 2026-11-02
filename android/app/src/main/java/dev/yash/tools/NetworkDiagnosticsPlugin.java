package dev.yash.tools;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.LinkAddress;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.TrafficStats;
import android.os.Build;
import android.os.SystemClock;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * App-owned, versioned bridge for the live connection meter. It reads the
 * active network's capabilities/link properties and the device-wide
 * TrafficStats counters. It declares no permission (ACCESS_NETWORK_STATE is
 * already in the reviewed budget), starts no service, collects no subscriber,
 * SSID, telephony, or account identifier, and never logs or stores a value.
 */
@CapacitorPlugin(name = "NetworkDiagnostics")
public final class NetworkDiagnosticsPlugin extends Plugin {

    private static final String ERROR_UNAVAILABLE = "NETWORK_DIAGNOSTICS_UNAVAILABLE";

    @PluginMethod
    public void getDetails(PluginCall call) {
        ConnectivityManager manager = connectivityManager();
        if (manager == null) {
            call.reject("Network diagnostics are not available.", ERROR_UNAVAILABLE);
            return;
        }

        JSObject result = new JSObject();
        result.put("contractVersion", NetworkDiagnosticsPolicy.CONTRACT_VERSION);
        result.put("vpn", false);
        JSArray addresses = new JSArray();
        JSArray dnsServers = new JSArray();

        Network network = manager.getActiveNetwork();
        if (network == null) {
            result.put("transport", "none");
            result.put("localAddresses", addresses);
            result.put("dnsServers", dnsServers);
            call.resolve(result);
            return;
        }

        NetworkCapabilities capabilities = manager.getNetworkCapabilities(network);
        LinkProperties properties = manager.getLinkProperties(network);

        result.put("transport", transportOf(capabilities));
        result.put("vpn", capabilities != null && capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN));

        if (capabilities != null) {
            result.put(
                "metered",
                !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
            );
            result.put(
                "validated",
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
            );
            result.put(
                "internetCapable",
                capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            );
            putPositive(result, "linkDownKbps", capabilities.getLinkDownstreamBandwidthKbps());
            putPositive(result, "linkUpKbps", capabilities.getLinkUpstreamBandwidthKbps());
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                Integer signal = NetworkDiagnosticsPolicy.signalOrNull(
                    capabilities.getSignalStrength()
                );
                if (signal != null) result.put("signalStrength", signal.intValue());
            }
        }

        if (properties != null) {
            String interfaceName = NetworkDiagnosticsPolicy.boundedAddress(
                properties.getInterfaceName()
            );
            if (interfaceName != null) result.put("interfaceName", interfaceName);

            Integer mtu = null;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                mtu = NetworkDiagnosticsPolicy.positiveOrNull(properties.getMtu());
            } else if (interfaceName != null) {
                // LinkProperties#getMtu is API 29+; the interface lookup works on the
                // version-1 minimum and needs no permission.
                try {
                    NetworkInterface networkInterface = NetworkInterface.getByName(interfaceName);
                    if (networkInterface != null) {
                        mtu = NetworkDiagnosticsPolicy.positiveOrNull(networkInterface.getMTU());
                    }
                } catch (SocketException ignored) {
                    // Unknown is an honest state; do not log the interface or address.
                }
            }
            if (mtu != null) result.put("mtu", mtu.intValue());

            Set<String> local = new LinkedHashSet<>();
            for (LinkAddress linkAddress : properties.getLinkAddresses()) {
                if (local.size() >= NetworkDiagnosticsPolicy.MAX_ADDRESSES) break;
                InetAddress address = linkAddress.getAddress();
                String text = address == null
                    ? null
                    : NetworkDiagnosticsPolicy.boundedAddress(address.getHostAddress());
                if (text != null) local.add(text);
            }
            for (String text : local) addresses.put(text);

            Set<String> dns = new LinkedHashSet<>();
            for (InetAddress server : properties.getDnsServers()) {
                if (dns.size() >= NetworkDiagnosticsPolicy.MAX_ADDRESSES) break;
                String text = server == null
                    ? null
                    : NetworkDiagnosticsPolicy.boundedAddress(server.getHostAddress());
                if (text != null) dns.add(text);
            }
            for (String text : dns) dnsServers.put(text);
        }

        result.put("localAddresses", addresses);
        result.put("dnsServers", dnsServers);
        call.resolve(result);
    }

    @PluginMethod
    public void getTraffic(PluginCall call) {
        long rxBytes = TrafficStats.getTotalRxBytes();
        long txBytes = TrafficStats.getTotalTxBytes();

        JSObject result = new JSObject();
        result.put("contractVersion", NetworkDiagnosticsPolicy.CONTRACT_VERSION);
        if (!NetworkDiagnosticsPolicy.countersSupported(rxBytes, txBytes)) {
            result.put("supported", false);
            call.resolve(result);
            return;
        }

        result.put("supported", true);
        result.put("rxBytes", rxBytes);
        result.put("txBytes", txBytes);
        // Milliseconds stay within JavaScript's safe integer range even after
        // months of uptime; nanosecond totals would not.
        result.put("elapsedRealtimeMs", SystemClock.elapsedRealtime());
        call.resolve(result);
    }

    private ConnectivityManager connectivityManager() {
        Object service = getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        return service instanceof ConnectivityManager ? (ConnectivityManager) service : null;
    }

    private static String transportOf(NetworkCapabilities capabilities) {
        if (capabilities == null) return "other";
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) return "vpn";
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return "wifi";
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) return "cellular";
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) return "ethernet";
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH)) return "bluetooth";
        return "other";
    }

    private static void putPositive(JSObject target, String key, int value) {
        Integer bounded = NetworkDiagnosticsPolicy.positiveOrNull(value);
        if (bounded != null) target.put(key, bounded.intValue());
    }
}
