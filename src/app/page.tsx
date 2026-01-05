import LetterForm from '@/components/LetterForm';

export default function Home() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 overflow-y-auto">
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            给未来的一封信
          </h1>
          <p className="text-lg text-gray-600">
            写下此刻的心情，在未来的某一天收到来自过去的自己的问候
          </p>
        </div>
        
        <LetterForm />
      </main>
    </div>
  );
}
