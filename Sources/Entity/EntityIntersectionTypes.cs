using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace Entity
{
	public static class IntersectionType
	{
		public const int NOT_DETECTED = 0;
		public const int BY_DIFF_OWNER = 1;
		public const int BY_EQUAL_OWNER = 2;
		public const int BY_ID = 3;
		public const int BY_BULLET_PASSING = 4;
	}
}