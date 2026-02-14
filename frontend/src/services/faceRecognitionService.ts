import * as faceapi from '@vladmandic/face-api';

class FaceRecognitionService {
    private modelsLoaded = false;

    async loadModels() {
        if (this.modelsLoaded) return;

        const MODEL_URL = '/models';

        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            this.modelsLoaded = true;
            console.log('Face Recognition Models Loaded');
        } catch (error) {
            console.error('Error loading face recognition models:', error);
            throw error;
        }
    }

    async getDescriptor(imageElement: HTMLImageElement | HTMLVideoElement): Promise<Float32Array | null> {
        await this.loadModels();

        const detection = await faceapi
            .detectSingleFace(imageElement, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        return detection ? detection.descriptor : null;
    }

    compareFaces(descriptor1: Float32Array, descriptor2: Float32Array): number {
        // Retorna a distância euclidiana. 
        // Geralmente < 0.6 é considerado o mesmo rosto. Quanto menor, mais parecido.
        return faceapi.euclideanDistance(descriptor1, descriptor2);
    }

    isMatch(distance: number, threshold = 0.5): boolean {
        return distance < threshold;
    }
}

export const faceRecognitionService = new FaceRecognitionService();
