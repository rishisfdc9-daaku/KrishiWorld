#!/usr/bin/env python3
"""KrishiWorld — fine-tune a crop-disease classifier (skeleton, runnable).
Author: Rishi Gullapalli (rishisfdc9-daaku)

This is the training path described in TRAINING.md. It is deliberately
a skeleton with real training code, not a claim of a trained model:
it needs a labelled dataset in the folder layout from TRAINING.md,
which is NOT bundled here. Run it only with data you have the right
to use, split by field/farm (see TRAINING.md — random splits flatter
accuracy and I do not want that in this project).

Usage:
    python train.py --data data --epochs 10 --out models/krishiworld-disease-v1.pt
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Fine-tune KrishiWorld disease model")
    parser.add_argument("--data", type=Path, required=True, help="Dataset root with train/ and val/ folders")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--lr", type=float, default=0.001)
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument("--out", type=Path, default=Path("models/krishiworld-disease-v1.pt"))
    parser.add_argument("--backbone", default="resnet", choices=["resnet", "mobilenet"])
    args = parser.parse_args(argv)

    for split in ("train", "val"):
        folder = args.data / split
        if not folder.is_dir():
            parser.error(f"Missing dataset folder: {folder} (see TRAINING.md for layout)")
    classes = sorted(p.name for p in (args.data / "train").iterdir() if p.is_dir())
    if len(classes) < 2:
        parser.error("Need at least 2 class folders under data/train/ to train a classifier")

    import torch
    from torch import nn
    from torch.utils.data import DataLoader
    from torchvision import datasets, models, transforms

    # Field-photo augmentation: brightness/crop/rotation help with real
    # phone photos. I deliberately do NOT add synthetic disease spots.
    train_tf = transforms.Compose([
        transforms.RandomResizedCrop(224),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.3, contrast=0.3),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_tf = transforms.Compose([
        transforms.Resize(256), transforms.CenterCrop(224), transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    train_ds = datasets.ImageFolder(args.data / "train", transform=train_tf)
    val_ds = datasets.ImageFolder(args.data / "val", transform=val_tf)
    # Sanity check: folder names are the classes. If this ever mismatches
    # the farmer-facing names, that is a data bug, not a model bug.
    assert train_ds.classes == classes, f"Class mismatch: {train_ds.classes} vs {classes}"

    device = "cuda" if torch.cuda.is_available() else "cpu"
    if args.backbone == "resnet":
        net = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
        net.fc = nn.Linear(net.fc.in_features, len(classes))
    else:
        net = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.IMAGENET1K_V2)
        net.classifier[-1] = nn.Linear(net.classifier[-1].in_features, len(classes))
    net = net.to(device)

    # Phase 1: freeze backbone, train only the new classifier head.
    # This is the transfer-learning step that makes a modest dataset viable.
    for name, param in net.named_parameters():
        param.requires_grad = ("fc" in name) or ("classifier" in name)
    optimiser = torch.optim.Adam(filter(lambda p: p.requires_grad, net.parameters()), lr=args.lr)
    criterion = nn.CrossEntropyLoss()
    train_loader = DataLoader(train_ds, batch_size=args.batch, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch)

    def run_epoch(loader, training: bool) -> tuple[float, float]:
        net.train(training)
        total_loss, correct, total = 0.0, 0, 0
        for images, labels in loader:
            images, labels = images.to(device), labels.to(device)
            if training:
                optimiser.zero_grad()
            outputs = net(images)
            loss = criterion(outputs, labels)
            if training:
                loss.backward()
                optimiser.step()
            total_loss += loss.item() * len(images)
            correct += int((outputs.argmax(1) == labels).sum())
            total += len(images)
        return total_loss / max(total, 1), correct / max(total, 1)

    print(f"Classes ({len(classes)}): {classes} | device: {device}")
    for epoch in range(1, args.epochs + 1):
        # Unfreeze after epoch 3 with a lower LR — full fine-tuning from
        # epoch 1 on a small dataset usually just destroys the pre-training.
        if epoch == 4:
            for param in net.parameters():
                param.requires_grad = True
            optimiser = torch.optim.Adam(net.parameters(), lr=args.lr / 10)
        train_loss, train_acc = run_epoch(train_loader, True)
        val_loss, val_acc = run_epoch(val_loader, False)
        print(f"epoch {epoch}: train loss {train_loss:.3f} acc {train_acc:.3f} | "
              f"val loss {val_loss:.3f} acc {val_acc:.3f}")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"state_dict": net.state_dict(), "classes": classes, "backbone": args.backbone},
               args.out)
    (args.out.parent / "classes.json").write_text(json.dumps(classes, indent=2))
    print(f"Saved model to {args.out} and classes to {args.out.parent / 'classes.json'}")
    print("Next: validate per-class accuracy on a held-out, agronomist-reviewed test set (TRAINING.md).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
