import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform, TargetPlatform;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import 'barcode_lookup_repository.dart';
import 'barcode_scan_result.dart';

bool get _supportsCameraScanning =>
    !kIsWeb && (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);

/// Camera-based scanning on Android/iOS/iPad (master spec §22). On
/// Windows/Web/desktop there is no camera API worth relying on here — a USB
/// barcode scanner acts as a keyboard on those platforms, so a plain text
/// field already "just works" without any scanning code, which is what the
/// manual-entry fallback below provides.
class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {
  final _manualController = TextEditingController();
  bool _loading = false;
  String? _error;
  BarcodeScanResult? _result;
  String? _scannedCode;

  Future<void> _lookup(String code) async {
    if (_loading) return;
    setState(() {
      _loading = true;
      _error = null;
      _scannedCode = code;
    });
    try {
      final result = await ref.read(barcodeLookupRepositoryProvider).lookup(code);
      setState(() {
        _result = result;
        _error = result == null ? 'No product found for "$code".' : null;
      });
    } catch (_) {
      setState(() => _error = 'Lookup failed. Check your connection and try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  void _onDetect(BarcodeCapture capture) {
    final code = capture.barcodes.firstOrNull?.rawValue;
    if (code != null && code != _scannedCode) {
      _lookup(code);
    }
  }

  @override
  void dispose() {
    _manualController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan Barcode')),
      body: Column(
        children: [
          if (_supportsCameraScanning)
            Expanded(
              flex: 3,
              child: MobileScanner(onDetect: _onDetect),
            ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _manualController,
                          decoration: const InputDecoration(
                            labelText: 'Barcode / SKU',
                            border: OutlineInputBorder(),
                          ),
                          onSubmitted: _lookup,
                        ),
                      ),
                      const SizedBox(width: 8),
                      FilledButton(
                        onPressed: () => _lookup(_manualController.text.trim()),
                        child: const Text('Look up'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (_loading) const Center(child: CircularProgressIndicator()),
                  if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  if (_result != null) _ResultCard(result: _result!),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ResultCard extends StatelessWidget {
  final BarcodeScanResult result;
  const _ResultCard({required this.result});

  @override
  Widget build(BuildContext context) {
    final product = result.product;
    final variant = result.variant;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(product['name'] as String? ?? '', style: Theme.of(context).textTheme.titleMedium),
            Text('SKU: ${product['sku']}'),
            if (variant != null) Text('Variant: ${variant['sku']}'),
          ],
        ),
      ),
    );
  }
}

extension _FirstOrNull<T> on List<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
