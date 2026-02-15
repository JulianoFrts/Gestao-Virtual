
export const clearHeavyStorage = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('obra_app_') || key === 'db.auth.token') {
            console.log('Removendo chave pesada:', key);
            localStorage.removeItem(key);
        }
    });
    alert('Limpeza concluída! Por favor, faça login novamente.');
    window.location.reload();
};

