import torch
import torchvision

print("PyTorch versão:", torch.__version__)
print("Torchvision versão:", torchvision.__version__)
print("CUDA disponível:", torch.cuda.is_available())
print("Versão CUDA no PyTorch:", torch.version.cuda)
print("Versão cuDNN:", torch.backends.cudnn.version())
