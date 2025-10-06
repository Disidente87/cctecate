import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Users, Target, Heart, DollarSign, Calendar, Star, Facebook, Instagram } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-primary-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg"></div>
              <span className="text-xl font-bold ">CC Tecate</span>
            </div>
            <Link href="/portal">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                Portal de Usuarios
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold  leading-tight">
                  Transforma tu vida,{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-600">
                    despierta tu liderazgo
                  </span>
                </h1>
                <p className="text-xl  leading-relaxed">
                  Únete a nuestra comunidad y descubre el poder de la inteligencia emocional, 
                  las metas personales y el crecimiento en comunidad.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-black">
                  Inscríbete ahora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Conoce más
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square relative rounded-2xl overflow-hidden shadow-2xl">
        <Image
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2071&q=80"
                  alt="Comunidad de liderazgo"
                  fill
                  className="object-cover"
          priority
        />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sobre el programa */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold  mb-4">
              Nuestro Proceso de Transformación
            </h2>
            <p className="text-xl  max-w-3xl mx-auto">
              Un viaje estructurado de crecimiento personal diseñado para despertar tu máximo potencial
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center border-2 border-primary-100 hover:border-primary-300 transition-colors">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-8 w-8 " />
                </div>
                <CardTitle className="text-2xl ">Nivel Básico</CardTitle>
                <CardDescription className="text-lg ">
                  Fin de semana intensivo de autoconocimiento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="">
                  Descubre tus fortalezas, identifica áreas de mejora y establece las bases 
                  para tu transformación personal.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 border-green-100 hover:border-green-300 transition-colors">
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 " />
                </div>
                <CardTitle className="text-2xl ">Nivel Avanzado</CardTitle>
                <CardDescription className="text-lg ">
                  2 semanas después del básico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="">
                  Profundiza en tus metas personales, desarrolla mecanismos de acción 
                  y comienza a construir tu plan de vida.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-2 border-yellow-100 hover:border-yellow-300 transition-colors">
              <CardHeader>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="h-8 w-8 " />
                </div>
                <CardTitle className="text-2xl ">Programa de Liderazgo</CardTitle>
                <CardDescription className="text-lg ">
                  PL1, PL2, PL3 - Evolución continua
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="">
                  Conviértete en líder de tu propia vida y de tu comunidad. 
                  Programa de seguimiento y crecimiento continuo.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold  mb-6">
                Beneficios que Transformarán tu Vida
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Heart className="h-5 w-5 " />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold  mb-2">Inteligencia Emocional</h3>
                    <p className="">Desarrolla la capacidad de reconocer, entender y gestionar tus emociones de manera efectiva.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Target className="h-5 w-5 " />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold  mb-2">Metas Personales</h3>
                    <p className="">Aprende a establecer y alcanzar objetivos claros en todas las áreas de tu vida.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <DollarSign className="h-5 w-5 " />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold  mb-2">Bienestar Financiero</h3>
                    <p className="">Desarrolla una relación saludable con el dinero y construye tu libertad financiera.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Users className="h-5 w-5 " />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold  mb-2">Comunidad de Apoyo</h3>
                    <p className="">Conecta con personas que comparten tus valores y objetivos de crecimiento.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square relative rounded-2xl overflow-hidden shadow-2xl">
            <Image
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
                  alt="Crecimiento personal"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold  mb-4">
              Lo que dicen nuestros participantes
            </h2>
            <p className="text-xl ">
              Historias reales de transformación y crecimiento
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-primary-100">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5  fill-current" />
                  ))}
                </div>
                <p className=" mb-4">
                  &ldquo;CC Tecate cambió completamente mi perspectiva sobre el liderazgo. 
                  Ahora tengo claridad en mis metas y la confianza para alcanzarlas.&rdquo;
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-primary-600 font-semibold">M</span>
                  </div>
                  <div>
                    <p className="font-semibold ">María González</p>
                    <p className="text-sm ">Generación C1</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-secondary-100">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5  fill-current" />
                  ))}
                </div>
                <p className=" mb-4">
                  &ldquo;La comunidad que encontré aquí es invaluable. El apoyo mutuo y 
                  la motivación constante me han ayudado a crecer como persona y profesional.&rdquo;
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-secondary-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-secondary-600 font-semibold">C</span>
                  </div>
                  <div>
                    <p className="font-semibold ">Carlos Rodríguez</p>
                    <p className="text-sm ">Generación C2</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-accent-100">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5  fill-current" />
                  ))}
                </div>
                <p className=" mb-4">
                  &ldquo;El programa me enseñó que el liderazgo comienza con uno mismo. 
                  Ahora soy más consciente de mis emociones y cómo impactan a los demás.&rdquo;
                </p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-accent-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-accent-600 font-semibold">A</span>
                  </div>
                  <div>
                    <p className="font-semibold ">Ana Martínez</p>
                    <p className="text-sm ">Generación C1</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-blue-300 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            ¿Listo para vivir la experiencia?
          </h2>
          <p className="text-xl  mb-8">
            Únete a nuestra comunidad y comienza tu transformación personal hoy mismo
          </p>
          <Button size="lg" className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300">
            Quiero vivir la experiencia
            <ArrowRight className="ml-2 h-6 w-6" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-400 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg"></div>
                <span className="text-xl font-bold">Creando Consciencia Tecate</span>
              </div>
              <p className="text-gray-400 mb-4">
                Transformando vidas a través del liderazgo consciente y el crecimiento personal.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                  <Facebook className="h-5 w-5" />
                  <span>Facebook</span>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors flex items-center space-x-2">
                  <Instagram className="h-5 w-5" />
                  <span>Instagram</span>
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Contacto</h3>
              <div className="space-y-2 text-gray-400">
                <p>info@cctecate.com</p>
                <p>+52 664 123 4567</p>
                <p>Tecate, Baja California</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Enlaces</h3>
              <div className="space-y-2">
                <Link href="/portal" className="block text-gray-400 hover:text-white transition-colors">
                  Portal de Usuarios
                </Link>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Política de Privacidad
                </a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors">
                  Términos de Servicio
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Creando Consciencia Tecate. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}