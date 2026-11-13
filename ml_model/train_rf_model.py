"""
GNSS SENTINEL - Scikit-Learn Python Random Forest Model & Exporter
Use this script if you wish to train or benchmark in Python with scikit-learn.
"""

import numpy as np
import json

def generate_gnss_synthetic_dataset(samples_per_class=500):
    np.random.seed(42)
    classes = ["Penetrable", "Non-Penetrable", "Threat", "Weak Signal", "Strong Signal"]
    X, y = [], []

    # 1. Penetrable
    for _ in range(samples_per_class):
        X.append([
            np.random.uniform(32.0, 39.5), # snr
            np.random.uniform(25.0, 65.0), # elevation
            np.random.uniform(0.0, 360.0), # azimuth
            np.random.uniform(0.4, 2.2),   # multipath variance
            np.random.uniform(0.5, 4.5),   # pseudorange residual
            np.random.uniform(0.2, 5.0),   # doppler residual
            np.random.uniform(0.1, 3.5),   # clock drift
            np.random.uniform(0.0, 1.8)    # cn0 jump delta
        ])
        y.append(0)

    # 2. Non-Penetrable (Heavy Obstruction / Multipath)
    for _ in range(samples_per_class):
        X.append([
            np.random.uniform(12.0, 22.5),
            np.random.uniform(2.0, 28.0),
            np.random.uniform(0.0, 360.0),
            np.random.uniform(4.5, 12.0),
            np.random.uniform(18.0, 65.0),
            np.random.uniform(8.0, 45.0),
            np.random.uniform(4.0, 15.0),
            np.random.uniform(2.5, 8.0)
        ])
        y.append(1)

    # 3. Threat (Spoofing / Jamming)
    for _ in range(samples_per_class):
        if np.random.rand() > 0.5:
            # Spoofing
            X.append([
                np.random.uniform(46.0, 56.0),
                np.random.uniform(4.0, 85.0),
                np.random.uniform(0.0, 360.0),
                np.random.uniform(0.2, 1.8),
                np.random.uniform(22.0, 85.0),
                np.random.uniform(35.0, 120.0),
                np.random.uniform(18.0, 52.0),
                np.random.uniform(6.0, 18.0)
            ])
        else:
            # Jamming
            X.append([
                np.random.uniform(8.0, 17.0),
                np.random.uniform(10.0, 80.0),
                np.random.uniform(0.0, 360.0),
                np.random.uniform(6.0, 15.0),
                np.random.uniform(30.0, 90.0),
                np.random.uniform(40.0, 140.0),
                np.random.uniform(25.0, 60.0),
                np.random.uniform(8.0, 22.0)
            ])
        y.append(2)

    # 4. Weak Signal
    for _ in range(samples_per_class):
        X.append([
            np.random.uniform(22.5, 29.0),
            np.random.uniform(12.0, 45.0),
            np.random.uniform(0.0, 360.0),
            np.random.uniform(2.0, 4.8),
            np.random.uniform(4.0, 15.0),
            np.random.uniform(3.0, 14.0),
            np.random.uniform(1.5, 6.0),
            np.random.uniform(0.5, 3.0)
        ])
        y.append(3)

    # 5. Strong Signal
    for _ in range(samples_per_class):
        X.append([
            np.random.uniform(39.8, 49.5),
            np.random.uniform(42.0, 90.0),
            np.random.uniform(0.0, 360.0),
            np.random.uniform(0.1, 0.9),
            np.random.uniform(0.1, 2.0),
            np.random.uniform(0.0, 1.8),
            np.random.uniform(0.0, 1.2),
            np.random.uniform(0.0, 0.9)
        ])
        y.append(4)

    return np.array(X), np.array(y), classes

if __name__ == "__main__":
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import classification_report, accuracy_score

        print("Generating GNSS defense signal dataset...")
        X, y, class_names = generate_gnss_synthetic_dataset(600)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        print(f"Training Scikit-Learn Random Forest (50 trees)...")
        rf = RandomForestClassifier(n_estimators=50, max_depth=8, oob_score=True, random_state=42)
        rf.fit(X_train, y_train)

        y_pred = rf.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        print(f"\nModel Accuracy: {acc*100:.2f}% (OOB Score: {rf.oob_score_*100:.2f}%)")
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=class_names))

        feature_names = [
            "SNR (C/N0)", "Elevation", "Azimuth", "Multipath Variance",
            "Pseudorange Residual", "Doppler Residual", "Clock Drift Rate", "C/N0 Step Delta"
        ]
        print("\nFeature Importances:")
        for name, imp in zip(feature_names, rf.feature_importances_):
            print(f"  {name:22s}: {imp*100:.2f}%")

    except ImportError:
        print("Scikit-learn not installed in current Python environment. The JavaScript embedded Random Forest is active and tested.")

