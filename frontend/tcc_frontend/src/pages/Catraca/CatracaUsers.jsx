import React from 'react'

export const CatracaUsers = () => {

    async function funcionarios(){
        const token = localStorage.getItem("access_token");
        try {
            const response = await axios.get(`${API_URL}/catraca_usuarios`,  {
            headers: {
            Authorization: `Bearer ${token}`,
            },
        });

        } catch (error) {
            console.error(error);
        }
    }

  return (
    <div>
        <div className='flex justify-center'>Câmera dos Funcionarios</div>
    </div>
  )
}
