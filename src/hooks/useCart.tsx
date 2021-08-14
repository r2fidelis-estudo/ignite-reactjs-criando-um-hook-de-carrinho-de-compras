import { createContext, ReactNode, useContext, useState } from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(`@RocketShoes:cart`)

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const addProduct = async (productId: number) => {
    try {
      const stock: Stock = await api
        .get(`/stock/${productId}`)
        .then(res => res.data)
      const updatedCart = [...cart]
      const productExists = updatedCart.find(p => p.id === productId)

      if (productExists?.amount === stock.amount) {
        toast.error(`Quantidade solicitada fora de estoque`)
        return
      }

      if (productExists) {
        productExists.amount += 1
      } else {
        await api.get(`/products/${productId}`).then(({ data: product }) => {
          updatedCart.push({ ...product, amount: 1 })
        })
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      setCart(updatedCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = cart.filter(p => p.id !== productId)

      if (updatedCart.length === cart.length) throw new Error()

      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(updatedCart))
      setCart(updatedCart)
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return

      const stock: Stock = await api
        .get(`/stock/${productId}`)
        .then(res => res.data)

      if (amount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.find(p => p.id === productId)

      if (productExists) productExists.amount = amount

      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(updatedCart))
      setCart(updatedCart)
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
