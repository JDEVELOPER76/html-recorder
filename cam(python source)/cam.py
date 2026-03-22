import tkinter as tk
import cv2
from PIL import Image, ImageTk

class CamaraSuperpuesta:
    def __init__(self):
        # Ventana principal
        self.ventana = tk.Tk()
        self.ventana.title("")
        self.ventana.overrideredirect(True)  # Quita bordes y barra de título
        
        # Hacer la ventana siempre encima
        self.ventana.attributes('-topmost', True)
        
        # Quitar fondo/blanco
        self.ventana.configure(bg='black')
        
        # Iniciar cámara
        self.cap = cv2.VideoCapture(0)
        
        if not self.cap.isOpened():
            print("❌ No se pudo abrir la cámara")
            self.ventana.destroy()
            return
        
        # Configurar resolución
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 220)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 180)
        
        # Obtener dimensiones del video
        ret, frame = self.cap.read()
        if ret:
            altura, ancho = frame.shape[:2]
            self.ventana.geometry(f"220x180")
        
        # Label para mostrar el video (sin bordes ni padding)
        self.label_video = tk.Label(self.ventana, bg='black', bd=0, highlightthickness=0)
        self.label_video.pack()
        
        # Permitir mover la ventana con el mouse
        self.label_video.bind("<Button-1>", self.iniciar_movimiento)
        self.label_video.bind("<B1-Motion>", self.mover_ventana)
        
        # Cerrar con Escape
        self.ventana.bind("<Escape>", lambda e: self.cerrar())
        
        # Actualizar video
        self.actualizar_video()
        
        # Cerrar al salir
        self.ventana.protocol("WM_DELETE_WINDOW", self.cerrar)
        
        # Variables para mover ventana
        self.x_inicial = 0
        self.y_inicial = 0
    
    def iniciar_movimiento(self, event):
        """Guarda la posición inicial del mouse"""
        self.x_inicial = event.x
        self.y_inicial = event.y
    
    def mover_ventana(self, event):
        """Mueve la ventana arrastrando"""
        x = self.ventana.winfo_x() + (event.x - self.x_inicial)
        y = self.ventana.winfo_y() + (event.y - self.y_inicial)
        self.ventana.geometry(f"+{x}+{y}")
    
    def actualizar_video(self):
        """Actualiza el frame del video"""
        ret, frame = self.cap.read()
        
        if ret:
            # Voltear horizontalmente (efecto espejo)
            frame = cv2.flip(frame, 1)
            
            # Convertir de BGR a RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Convertir a formato ImageTk
            imagen = Image.fromarray(frame_rgb)
            imagen_tk = ImageTk.PhotoImage(image=imagen)
            
            # Actualizar label
            self.label_video.config(image=imagen_tk)
            self.label_video.image = imagen_tk
        
        # Programar próxima actualización
        self.ventana.after(33, self.actualizar_video)
    
    def cerrar(self):
        """Cierra la cámara y la ventana"""
        if self.cap is not None:
            self.cap.release()
        cv2.destroyAllWindows()
        self.ventana.quit()
        self.ventana.destroy()
    
    def ejecutar(self):
        """Inicia la aplicación"""
        self.ventana.mainloop()


# ========== EJECUTAR ==========
if __name__ == "__main__":
    app = CamaraSuperpuesta()
    app.ejecutar()